import { Model, RelationMappings } from 'objection';
import { pascalCase } from 'change-case-all';
import { Knex } from 'knex';

/**
 * Function to generate models dynamically based on database structures
 * @param {Knex} knexInstance - The knex instance connected to the database
 * @returns {Promise<Record<string, typeof Model>>} - Returns a promise that resolves to an object containing all generated models
 */
export async function generateModels(knexInstance: Knex): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};

  try {
    // Query structures from the database
    const structures = await knexInstance('sqlite_master')
      .whereIn('type', ['table', 'view'])
      .select('name', 'type');

    for (const { name: structureName, type } of structures) {
      // Get column information
      const columns = await knexInstance.raw(`PRAGMA table_info("${structureName}")`).then(res => res.rows || res);
      const foreignKeys = await knexInstance.raw(`PRAGMA foreign_key_list("${structureName}")`).then(res => res.rows || res);

      // Defining the dynamic model class
      const DynamicModel = class extends Model {
        static get tableName(): string {
          return structureName;
        }

        static get jsonSchema(): Record<string, unknown> {
          const requiredFields: string[] = [];
          const schemaProperties: Record<string, Record<string, unknown>> = {};

          for (const column of columns) {
            const format = mapSqliteTypeToJsonFormat(column.type, column.name);
            const type = mapSqliteTypeToJsonType(column.type);
            const property: Record<string, unknown> = {
            };

            if (type !== 'buffer') {
              property.type = type;
            }

            if (column.notnull && !column.dflt_value) {
              requiredFields.push(column.name);
            }

            if (column.comment) {
              property.description = column.comment;
            }

            if (/^(INT|INTEGER|REAL)$/i.test(column.type) && column.unsigned) {
              property.minimum = 0;
            }

            const lengthMatch = column.type.match(/\((\d+)\)/);
            if (lengthMatch && property.type === 'string') {
              if (lengthMatch[1]) {
                property.maxLength = parseInt(lengthMatch[1], 10);
              }
            }

            property.$comment = [type, format].filter(Boolean).join('.');

            const prefix = type === 'buffer' ? 'x-' : '';
            schemaProperties[prefix + column.name] = property;
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
 * Function to map SQLite types to JSON Schema types
 * @param {string} sqliteType - The SQLite data type
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapSqliteTypeToJsonType(sqliteType: string): string {
  const baseType = sqliteType.replace(/\([\d,]+\)/, '').toUpperCase();
  //console.log('TYPES:', sqliteType, baseType);
  const typeMap: Record<string, string> = {
    BOOLEAN: 'boolean',
    BINARY: 'buffer',
    BLOB: 'buffer',
    BIGINT: 'integer',
    INT: 'integer',
    INT2: 'integer',
    INT8: 'integer',
    INTEGER: 'integer',
    MEDIUMINT: 'integer',
    SMALLINT: 'integer',
    TINYINT: 'integer',
    DECIMAL: 'number',
    DOUBLE: 'number',
    FLOAT: 'number',
    NUMERIC: 'number',
    REAL: 'number',
    CHARACTER: 'string',
    CLOB: 'string',
    DATE: 'string',
    DATETIME: 'string',
    NCHAR: 'string',
    NVARCHAR: 'string',
    TEXT: 'string',
    TIME: 'string',
    VARCHAR: 'string',
  };
  return typeMap[baseType] || 'string';
}

/**
 * Function to map SQLite types to JSON Schema formats
 * @param {string} sqliteType - The SQLite data type
 * @param {string} colName - Allow to infer more formats, like email, phone....
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapSqliteTypeToJsonFormat(sqliteType: string, colName: string): string | undefined {
  const baseType = sqliteType.replace(/\([\d,]+\)/, '').toUpperCase();
  //console.log('TYPES:', sqliteType, baseType);
  const typeMap: Record<string, string> = {
    DATE: 'date',
    DATETIME: 'datetime',
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
