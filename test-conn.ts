import knex from 'knex';
import 'dotenv/config';

async function test() {
  const knexInstance = knex({
    client: 'mssql',
    connection: {
      server: process.env.DB_MSSQL_HOST || 'localhost',
      port: parseInt(process.env.DB_MSSQL_PORT || '1434'),
      user: process.env.DB_MSSQL_USER || 'sa',
      password: process.env.DB_MSSQL_PASSWORD,
      database: process.env.DB_MSSQL_DATABASE || 'adba_test',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    },
  });

  try {
    await knexInstance.raw('SELECT 1');
    console.log('Connection successful!');
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await knexInstance.destroy();
  }
}

test();
