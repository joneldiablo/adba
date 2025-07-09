import { Knex } from 'knex';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface DumpDatabaseResult {
  schemaFile: string;
  fullFile: string;
}

/**
 * Dump database structure and data using CLI tools.
 * @param knexInstance Connected knex instance
 * @param dumpDir Directory where dump files will be stored
 * @returns Paths to created files
 */
export async function dumpDatabase(knexInstance: Knex, dumpDir: string): Promise<DumpDatabaseResult> {
  const client = (knexInstance.client.config.client || '').toLowerCase();
  const connection = knexInstance.client.config.connection as any;

  await fs.promises.mkdir(dumpDir, { recursive: true });

  const schemaFile = path.join(dumpDir, 'schema.sql');
  const fullFile = path.join(dumpDir, 'schema_data.sql');

  switch (client) {
    case 'sqlite':
    case 'sqlite3': {
      const filename = connection.filename;
      await execAsync(`sqlite3 "${filename}" .schema > "${schemaFile}"`);
      await execAsync(`sqlite3 "${filename}" .dump > "${fullFile}"`);
      break;
    }
    case 'mysql':
    case 'mysql2': {
      const { host = 'localhost', user, password = '', port, database } = connection;
      const cred = `-h ${host} -u ${user}`;
      const portOpt = port ? ` -P ${port}` : '';
      const passOpt = password ? ` -p${password}` : '';
      await execAsync(`mysqldump --routines --triggers --no-data ${cred}${portOpt}${passOpt} ${database} > "${schemaFile}"`);
      await execAsync(`mysqldump --routines --triggers ${cred}${portOpt}${passOpt} ${database} > "${fullFile}"`);
      break;
    }
    case 'pg':
    case 'postgres':
    case 'postgresql': {
      const { host = 'localhost', user, password = '', port, database } = connection;
      const env = { ...process.env, PGPASSWORD: password };
      const portOpt = port ? ` -p ${port}` : '';
      await execAsync(`pg_dump --schema-only -h ${host}${portOpt} -U ${user} ${database} > "${schemaFile}"`, { env });
      await execAsync(`pg_dump -h ${host}${portOpt} -U ${user} ${database} > "${fullFile}"`, { env });
      break;
    }
    default:
      throw new Error(`Dump not implemented for client ${client}`);
  }

  return { schemaFile, fullFile };
}

export default dumpDatabase;
