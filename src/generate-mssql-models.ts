import { Model, RelationMappings, JSONSchema } from 'objection';
import { Knex } from 'knex';
import { deepMerge } from 'dbl-utils';

import { className, jsonSchemaToColumns, ITableColumn } from './model-utilities';
import { IGenerateModelsOptions } from './types';

/**
 * Generates MSSQL models dynamically based on database structures.
 * @param knexInstance - The Knex instance connected to the database.
 * @param opts - Options including parse and format functions.
 * @returns A promise that resolves to an object containing all generated models.
 */
export async function generateMSSQLModels(
  knexInstance: Knex,
  opts: IGenerateModelsOptions = {}
): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};
  const { relationsFunc, squemaFixings, columnsFunc, parseFunc, formatFunc } = opts;

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

      // Define a dynamic model class
      const DynamicModel = class extends Model {
        /**
         * Returns the table name for the model.
         */
        static get tableName(): string {
          return structureName;
        }

        /**
         * Constructs the JSON schema based on the table structure.
         * @returns The JSON schema object for the table.
         */
        static get jsonSchema(): JSONSchema {
          const requiredFields: string[] = [];
          const schemaProperties: Record<string, JSONSchema> = {};

          for (const column of columns) {
            const format = mapMssqlTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapMssqlTypeToJsonType(column.data_type);
            const property: JSONSchema = {
              type: type !== 'buffer' ? type : undefined
            };

            if (column.is_nullable === 'NO' && !column.column_default) {
              requiredFields.push(column.column_name);
            }

            property.$comment = [type, format].filter(Boolean).join('.');
            const prefix = type === 'buffer' ? 'x-' : '';
            schemaProperties[prefix + column.column_name] = property;
          }

          if (typeof squemaFixings === 'function') {
            const r = squemaFixings(structureName, schemaProperties);
            if (r) deepMerge(schemaProperties, r);
          }

          return {
            type: 'object',
            properties: schemaProperties,
            required: requiredFields.length ? requiredFields : undefined,
          };
        }

        /**
         * Constructs relation mappings for the model.
         * @returns An object containing relation mappings.
         */
        static get relationMappings(): RelationMappings {
          const relations: RelationMappings = {};

          for (const fk of foreignKeys) {
            const relatedModel = Object.values(models).find((Model) => Model.tableName === fk.table);
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

          if (typeof relationsFunc === 'function') {
            const r = relationsFunc(structureName, relations);
            if (r) Object.assign(relations, r);
          }

          return relations;
        }

        /**
         * Columns information derived from the JSON schema.
         */
        static get columns(): Record<string, ITableColumn> {
          const { properties = {}, required = [] } = this.jsonSchema as any;
          const cols = jsonSchemaToColumns(properties, required as string[]);
          if (typeof columnsFunc === 'function') {
            const r = columnsFunc(structureName, cols);
            if (r) deepMerge(cols, r);
          }
          return cols;
        }

        /**
         * Parses the database JSON.
         * @param json The JSON object from the database.
         * @returns The parsed JSON object.
         */
        $parseDatabaseJson(json: any) {
          json = super.$parseDatabaseJson(json);
          return typeof parseFunc === 'function' ? parseFunc(structureName, json) : json;
        }

        /**
         * Formats the JSON object for the database.
         * @param json The JSON object to be formatted.
         * @returns The formatted JSON object.
         */
        $formatDatabaseJson(json: any) {
          json = super.$formatDatabaseJson(json);
          return typeof formatFunc === 'function' ? formatFunc(structureName, json) : json;
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
 * Maps MSSQL data types to corresponding JSON Schema types.
 * @param mssqlType - The MSSQL data type.
 * @returns The JSON Schema type.
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
    TIME: 'string',
  };
  return typeMap[baseType] || 'string';
}

/**
 * Maps MSSQL data types to corresponding JSON Schema formats.
 * @param mssqlType - The MSSQL data type.
 * @param colName - The column name for potential additional format inference.
 * @returns The JSON Schema format if applicable.
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


