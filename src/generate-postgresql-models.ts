import { Model, RelationMappings, JSONSchema } from 'objection';
import { Knex } from 'knex';

import { deepMerge } from 'dbl-utils';

import { className } from './model-utilities';
import { IGenerateModelsOptions } from './types';

/**
 * Generates PostgreSQL models dynamically based on database structures.
 * @param knexInstance - The Knex instance connected to the database.
 * @param opts - Options including parse and format functions.
 * @returns A promise that resolves to an object containing all generated models.
 */
export async function generatePostgreSQLModels(
  knexInstance: Knex,
  opts: IGenerateModelsOptions = {}
): Promise<Record<string, typeof Model>> {
  const models: Record<string, typeof Model> = {};
  const { relationsFunc, squemaFixings, parseFunc, formatFunc } = opts;

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
            const format = mapPostgresTypeToJsonFormat(column.data_type, column.column_name);
            const type = mapPostgresTypeToJsonType(column.data_type);
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
 * Maps PostgreSQL data types to corresponding JSON Schema types.
 * @param postgresType - The PostgreSQL data type.
 * @returns The JSON Schema type.
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
    TIME: 'string',
  };
  return typeMap[baseType] || 'string';
}

/**
 * Maps PostgreSQL data types to corresponding JSON Schema formats.
 * @param postgresType - The PostgreSQL data type.
 * @param colName - The column name for potential additional format inference.
 * @returns The JSON Schema format if applicable.
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
