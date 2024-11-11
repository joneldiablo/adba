import { Knex } from 'knex';
import { Model } from 'objection';

// Import existing functions
import { IGenerateModelsOptions } from './types';
import { generateSQLiteModels } from './generate-sqlite-models';
import { generatePostgreSQLModels } from './generate-postgresql-models';
import { generateMySQLModels } from './generate-mysql-models';
import { generateMSSQLModels } from './generate-mssql-models';


/**
 * Generates models based on the structure of the database specified in the Knex instance.
 * @param {Knex} knexInstance - The Knex instance connected to the database.
 * @param {IGenerateModelsOptions} [opts={}] - Options including parse and format functions.
 * @returns {Promise<Record<string, typeof Model>>} - A promise that resolves to an object containing all generated models.
 */
export async function generateModels(
  knexInstance: Knex,
  opts: IGenerateModelsOptions = {}
): Promise<Record<string, typeof Model>> {
  const client = knexInstance.client.config.client;

  switch (client) {
    case 'sqlite':
    case 'sqlite3':
      return await generateSQLiteModels(knexInstance, opts);
    case 'pg':
      return await generatePostgreSQLModels(knexInstance, opts);
    case 'mysql':
    case 'mysql2':
      return await generateMySQLModels(knexInstance, opts);
    case 'mssql':
      return await generateMSSQLModels(knexInstance, opts);
    default:
      throw new Error(`Unsupported database client: ${client}`);
  }
}

