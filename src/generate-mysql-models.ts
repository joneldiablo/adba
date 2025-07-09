import { Model, RelationMappings, JSONSchema } from 'objection';
import { Knex } from 'knex';

import { deepMerge } from 'dbl-utils';

import { className, jsonSchemaToColumns, ITableColumn } from './model-utilities';
import { IGenerateModelsOptions } from './types';

/**
 * Generates MySQL models dynamically based on database structures.
 * @param knexInstance - The Knex instance connected to the database.
 * @param opts - Options including parse and format functions.
 * @returns A promise that resolves to an object containing all generated models.
 */
export async function generateMySQLModels(
  knexInstance: Knex,
  opts: IGenerateModelsOptions = {}
): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};
  const { relationsFunc, squemaFixings, columnsFunc, parseFunc, formatFunc } = opts;

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
            const format = mapMySqlTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapMySqlTypeToJsonType(column.data_type);
            const property: JSONSchema = {
              type: type !== 'buffer' ? type : undefined,
              description: column.column_comment || undefined
            };

            if (column.is_nullable === 'NO') {
              requiredFields.push(column.column_name);
            }

            if (/^(INT|INTEGER|REAL)$/i.test(column.data_type) && column.column_key !== 'PRI') {
              property.minimum = 0;
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
 * Maps MySQL data types to corresponding JSON Schema types.
 * @param mysqlType - The MySQL data type.
 * @returns The JSON Schema type.
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
    TIME: 'string',
  };
  return typeMap[baseType] || 'string';
}

/**
 * Maps MySQL data types to corresponding JSON Schema formats.
 * @param mysqlType - The MySQL data type.
 * @param colName - The column name for potential additional format inference.
 * @returns The JSON Schema format if applicable.
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

