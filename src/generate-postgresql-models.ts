import { Model, RelationMappings } from 'objection';
import { pascalCase } from 'change-case-all';
import { Knex } from 'knex';

/**
 * Function to generate models dynamically based on database structures for PostgreSQL
 * @param {Knex} knexInstance - The knex instance connected to the database
 * @returns {Promise<Record<string, typeof Model>>} - Returns a promise that resolves to an object containing all generated models
 */
export async function generatePostgreSQLModels(knexInstance: Knex): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};

  try {
    // Query table and view structures from the database
    const tables = await knexInstance('information_schema.tables')
      .where('table_schema', 'public')
      .select('table_name AS name', knexInstance.raw(`'table' as type`));

    const structures = [...tables];

    for (const { name: structureName, type } of structures) {
      const columns = await knexInstance('information_schema.columns')
        .where('table_schema', 'public')
        .andWhere('table_name', structureName)
        .select('column_name', 'data_type', 'is_nullable', 'column_default');

      const foreignKeys = await knexInstance.raw(`
        SELECT
          ccu.column_name AS "from",
          ctu.table_name AS "table",
          ccu_pk.column_name AS "to"
        FROM
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
          JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
          AND tc.table_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage ccu_pk
          ON rc.unique_constraint_name = ccu_pk.constraint_name
          AND rc.unique_constraint_schema = ccu_pk.constraint_schema
          JOIN information_schema.columns ctu
          ON ctu.table_name = ccu_fk.table_name
          AND ctu.column_name = ccu_fk.column_name
        WHERE
          ctu.table_schema = 'public'
          AND tc.table_name = ?
      `, [structureName]).then(res => res.rows);

      // Defining the dynamic model class
      const DynamicModel = class extends Model {
        static get tableName(): string {
          return structureName;
        }

        static get jsonSchema(): Record<string, unknown> {
          const requiredFields: string[] = [];
          const schemaProperties: Record<string, Record<string, unknown>> = {};

          for (const column of columns) {
            const format = mapPostgresTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapPostgresTypeToJsonType(column.data_type);
            const property: Record<string, unknown> = {};

            if (type !== 'buffer') {
              property.type = type;
            }

            if (column.is_nullable === 'NO' && !column.column_default) {
              requiredFields.push(column.column_name);
            }

            // Additional properties could be set here

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
 * Function to map PostgreSQL types to JSON Schema types
 * @param {string} postgresType - The PostgreSQL data type
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapPostgresTypeToJsonType(postgresType: string): string {
  const baseType = postgresType.toUpperCase();
  const typeMap: Record<string, string> = {
    BOOLEAN: 'boolean',
    BYTEA: 'buffer',
    BIGINT: 'integer',
    INT: 'integer',
    INTEGER: 'integer',
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
    TIMESTAMP: 'string',
    TIMESTAMPTZ: 'string',
    TIME: 'string'
  };
  return typeMap[baseType] || 'string';
}

/**
 * Function to map PostgreSQL types to JSON Schema formats
 * @param {string} postgresType - The PostgreSQL data type
 * @param {string} colName - Allow to infer more formats, like email, phone....
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapPostgresTypeToJsonFormat(postgresType: string, colName: string): string | undefined {
  const baseType = postgresType.toUpperCase();
  const typeMap: Record<string, string> = {
    DATE: 'date',
    TIMESTAMP: 'datetime',
    TIMESTAMPTZ: 'datetime',
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
