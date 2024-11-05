import { Model, RelationMappings } from 'objection';
import { pascalCase } from 'change-case-all';
import { Knex } from 'knex';

/**
 * Function to generate models dynamically based on database structures for MSSQL
 * @param {Knex} knexInstance - The knex instance connected to the database
 * @returns {Promise<Record<string, typeof Model>>} - Returns a promise that resolves to an object containing all generated models
 */
export async function generateMSSQLModels(knexInstance: Knex): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};

  try {
    // Query table and view structures from the database
    const structures = await knexInstance.raw(`
      SELECT TABLE_NAME as name, TABLE_TYPE as type 
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
    `).then(res => res.recordset);

    for (const { name: structureName, type } of structures) {
      const columns = await knexInstance.raw(`
        SELECT COLUMN_NAME as column_name, DATA_TYPE as data_type, IS_NULLABLE as is_nullable, COLUMN_DEFAULT as column_default
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
      `, [structureName]).then(res => res.recordset);

      const foreignKeys = await knexInstance.raw(`
        SELECT 
          fk.name AS fk_name, 
          tp.name AS table, 
          rcp.name AS to, 
          cp.name AS from 
        FROM sys.foreign_keys AS fk
        INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
        INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
        INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
        INNER JOIN sys.columns AS rcp ON fkc.referenced_object_id = rcp.object_id AND fkc.referenced_column_id = rcp.column_id
        WHERE tp.name = ?
      `, [structureName]).then(res => res.recordset);

      // Defining the dynamic model class
      const DynamicModel = class extends Model {
        static get tableName(): string {
          return structureName;
        }

        static get jsonSchema(): Record<string, unknown> {
          const requiredFields: string[] = [];
          const schemaProperties: Record<string, Record<string, unknown>> = {};

          for (const column of columns) {
            const format = mapMssqlTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapMssqlTypeToJsonType(column.data_type);
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
      const suffix = type === 'BASE TABLE' ? 'Table' : 'View';
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
 * Function to map MSSQL types to JSON Schema types
 * @param {string} mssqlType - The MSSQL data type
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapMssqlTypeToJsonType(mssqlType: string): string {
  const baseType = mssqlType.toUpperCase();
  const typeMap: Record<string, string> = {
    BIT: 'boolean',
    VARBINARY: 'buffer',
    BINARY: 'buffer',
    BIGINT: 'integer',
    INT: 'integer',
    SMALLINT: 'integer',
    TINYINT: 'integer',
    DECIMAL: 'number',
    FLOAT: 'number',
    NUMERIC: 'number',
    REAL: 'number',
    CHAR: 'string',
    VARCHAR: 'string',
    NVARCHAR: 'string',
    TEXT: 'string',
    NTEXT: 'string',
    DATE: 'string',
    DATETIME: 'string',
    DATETIME2: 'string',
    SMALLDATETIME: 'string',
    TIME: 'string'
  };
  return typeMap[baseType] || 'string';
}

/**
 * Function to map MSSQL types to JSON Schema formats
 * @param {string} mssqlType - The MSSQL data type
 * @param {string} colName - Allow to infer more formats, like email, phone...
 * @returns {string} - Corresponding JSON Schema type
 */
export function mapMssqlTypeToJsonFormat(mssqlType: string, colName: string): string | undefined {
  const baseType = mssqlType.toUpperCase();
  const typeMap: Record<string, string> = {
    DATE: 'date',
    DATETIME: 'datetime',
    DATETIME2: 'datetime',
    SMALLDATETIME: 'datetime',
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
