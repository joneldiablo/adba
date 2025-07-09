import { Model, RelationMappings, JSONSchema, JSONSchemaTypeName } from 'objection';
import { Knex } from 'knex';

import { deepMerge } from 'dbl-utils';

import { className, jsonSchemaToColumns, ITableColumn } from './model-utilities';
import { IGenerateModelsOptions } from './types';

/**
 * Generates SQLite models using Knex and the provided options for parsing and formatting.
 * @param knexInstance - The Knex instance connected to the SQLite database.
 * @param opts - The options containing parse and format functions.
 * @returns A promise that resolves to a record of models.
 */
export async function generateSQLiteModels(
  knexInstance: Knex,
  opts: IGenerateModelsOptions = {}
): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};
  const { relationsFunc, squemaFixings, columnsFunc, parseFunc, formatFunc } = opts;

  try {
    // Query database structures from SQLite
    const structures = await knexInstance('sqlite_master')
      .whereIn('type', ['table', 'view'])
      .select('name', 'type');

    for (const { name: structureName, type } of structures) {
      // Get column information
      const columns = await knexInstance.raw(`PRAGMA table_info("${structureName}")`).then(res => res.rows || res);
      const foreignKeys = await knexInstance.raw(`PRAGMA foreign_key_list("${structureName}")`).then(res => res.rows || res);

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
            const format = mapSqliteTypeToJsonFormat(column.type, column.name);
            const type = mapSqliteTypeToJsonType(column.type);
            const property: JSONSchema = {
              type: type !== 'buffer' ? type : undefined
            };

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
            if (lengthMatch && property.type === 'string' && lengthMatch[1]) {
              property.maxLength = parseInt(lengthMatch[1], 10);
            }
            property.$comment = [type, format].filter(Boolean).join('.');
            const prefix = type === 'buffer' ? 'x-' : '';
            schemaProperties[prefix + column.name] = property;
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
            const RelatedModel = Object.values(models).find((Model) => Model.tableName === fk.table);
            if (!RelatedModel) {
              throw new Error(`${structureName}: Model for table ${fk.table} not found`);
            }
            relations[`${fk.table}`] = {
              relation: Model.BelongsToOneRelation,
              modelClass: RelatedModel,
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
         * @param json - The JSON object from the database.
         * @returns The parsed JSON object.
         */
        $parseDatabaseJson(json: any) {
          json = super.$parseDatabaseJson(json);
          return typeof parseFunc === 'function' ? parseFunc(structureName, json) : json;
        }

        /**
         * Formats the JSON object for the database.
         * @param json - The JSON object to be formatted.
         * @returns The formatted JSON object.
         */
        $formatDatabaseJson(json: any) {
          json = super.$formatDatabaseJson(json);
          return typeof formatFunc === 'function' ? formatFunc(structureName, json) : json;
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
 * Maps SQLite data types to corresponding JSON Schema types.
 * @param sqliteType - The SQLite data type.
 * @returns The JSON Schema type.
 */
export function mapSqliteTypeToJsonType(sqliteType: string): JSONSchemaTypeName {
  const baseType = sqliteType.replace(/\([\d,]+\)/, '').toUpperCase();
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
 * Maps SQLite data types to corresponding JSON Schema formats.
 * @param sqliteType - The SQLite data type.
 * @param colName - The column name for potential additional format inference.
 * @returns The JSON Schema format if applicable.
 */
export function mapSqliteTypeToJsonFormat(sqliteType: string, colName: string): string | undefined {
  const baseType = sqliteType.replace(/\([\d,]+\)/, '').toUpperCase();
  const typeMap: Record<string, string> = {
    DATE: 'date',
    DATETIME: 'datetime',
    TIME: 'time',
  };
  return typeMap[baseType] || undefined;
}
