import { Model, RelationMappings } from 'objection';
import { pascalCase } from 'change-case-all';
import { Knex } from 'knex';

/**
 * Function to generate models dynamically based on database structures for MySQL
 * @param {Knex} knexInstance - The knex instance connected to the database
 * @returns {Promise<Record<string, typeof Model>>} - Returns a promise that resolves to an object containing all generated models
 */
export async function generateMySQLModels(knexInstance: Knex): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};

  try {
    // Query table and view structures from the database
    const [tables, views] = await Promise.all([
      knexInstance('information_schema.tables')
        .where('table_schema', knexInstance.client.config.connection.database)
        .select('table_name AS name', knexInstance.raw(`'table' as type`)),
      knexInstance('information_schema.views')
        .where('table_schema', knexInstance.client.config.connection.database)
        .select('table_name AS name', knexInstance.raw(`'view' as type`))
    ]);

    const structures = [...tables, ...views];

    for (const { name: structureName, type } of structures) {
      const columns = await knexInstance('information_schema.columns')
        .where('table_schema', knexInstance.client.config.connection.database)
        .andWhere('table_name', structureName)
        .select('column_name', 'data_type', 'is_nullable', 'column_comment', 'column_key');

      const foreignKeys = await knexInstance('information_schema.key_column_usage')
        .where('table_schema', knexInstance.client.config.connection.database)
        .andWhere('table_name', structureName)
        .andWhereNot('referenced_table_name', null)
        .select('column_name AS from', 'referenced_table_name AS table', 'referenced_column_name AS to');

      // Defining the dynamic model class
      const DynamicModel = class extends Model {
        static get tableName(): string {
          return structureName;
        }

        static get jsonSchema(): Record<string, unknown> {
          const requiredFields: string[] = [];
          const schemaProperties: Record<string, Record<string, unknown>> = {};

          for (const column of columns) {
            const format = mapMySqlTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapMySqlTypeToJsonType(column.data_type);
            const property: Record<string, unknown> = {};

            if (type !== 'buffer') {
              property.type = type;
            }

            if (column.is_nullable === 'NO') {
              requiredFields.push(column.column_name);
            }

            if (column.column_comment) {
              property.description = column.column_comment;
            }

            if (/^(INT|INTEGER|REAL)$/i.test(column.data_type) && column.column_key !== 'PRI') {
              property.minimum = 0;
            }

            property.$comment = [type, format].filter(Boolean).join('.');

            const prefix = type === 'buffer' ? 'x-' : '';
            schemaProperties[prefix + column.column_name] = property;
          }

          return {
            type: 'object',
            properties: schemaProperties,
            required: requiredFields.length ? requiredFields : undefined,
          };
        }

        static get relationMappings(): RelationMappings {
          const relations: RelationMappings = {};

          for (const fk of foreignKeys) {
            const relatedModel = Object.values(models).find(
              (Model) => Model.tableName === fk.table
            );

            if (!relatedModel) {
              throw new Error(`${structureName}: Model for table ${fk.table} not found`);
            }

            relations[`${fk.table}`] = {
              relation: Model.BelongsToOneRelation,
              modelClass: relatedModel,
              join: {
                from: `${structureName}.${fk.from}`,
                to: `${fk.table}.${fk.to}`,
              },
            };
          }

          return relations;
        }
      };

      const pascalCaseName = className(structureName);
      const suffix = type === 'table' ? 'Table' : 'View';
      const modelName = `${pascalCaseName}${suffix}Model`;
      Object.defineProperty(DynamicModel, 'name', { value: modelName });
      DynamicModel.knex(knexInstance);

      models[modelName] = DynamicModel;
    }
  } catch (err) {
    console.error('Error generating models:', err);
  }

  return models;
}

/**
 * Function to map MySQL types to JSON Schema types
 * @param {string} mysqlType - The MySQL data type
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapMySqlTypeToJsonType(mysqlType: string): string {
  const baseType = mysqlType.toUpperCase();
  const typeMap: Record<string, string> = {
    BOOLEAN: 'boolean',
    BINARY: 'buffer',
    BLOB: 'buffer',
    BIGINT: 'integer',
    INT: 'integer',
    INTEGER: 'integer',
    MEDIUMINT: 'integer',
    SMALLINT: 'integer',
    TINYINT: 'integer',
    DECIMAL: 'number',
    DOUBLE: 'number',
    FLOAT: 'number',
    NUMERIC: 'number',
    REAL: 'number',
    CHAR: 'string',
    VARCHAR: 'string',
    TEXT: 'string',
    DATE: 'string',
    DATETIME: 'string',
    TIMESTAMP: 'string',
    TIME: 'string'
  };
  return typeMap[baseType] || 'string';
}

/**
 * Function to map MySQL types to JSON Schema formats
 * @param {string} mysqlType - The MySQL data type
 * @param {string} colName - Allow to infer more formats, like email, phone....
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapMySqlTypeToJsonFormat(mysqlType: string, colName: string): string | undefined {
  const baseType = mysqlType.toUpperCase();
  const typeMap: Record<string, string> = {
    DATE: 'date',
    DATETIME: 'datetime',
    TIMESTAMP: 'datetime',
    TIME: 'time',
  };
  return typeMap[baseType] || undefined;
}

/**
 * Function to convert string into PascalCase
 * It handles strings presented in kebab-case or snake_case
 * @param {string} str - The string to convert
 * @returns {string} - The converted PascalCase string
 */
function className(str: string): string {
  return pascalCase(str);
}
