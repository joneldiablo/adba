import express from 'express';
import knex, { Knex } from 'knex';
import { generateModels, routesObject, expressRouter } from '../../src/index';

interface DBConfig {
  name: string;
  client: 'sqlite3' | 'mysql2' | 'pg' | 'mssql';
  connection: any;
}

function getDatabaseConfig(dbKey: string): DBConfig {
  if (dbKey === 'sqlite') {
    return {
      name: 'SQLite',
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    };
  }

  if (dbKey === 'mysql') {
    return {
      name: 'MySQL/MariaDB',
      client: 'mysql2',
      connection: {
        host: process.env.DB_MYSQL_HOST || 'localhost',
        port: parseInt(process.env.DB_MYSQL_PORT || '3307'),
        user: process.env.DB_MYSQL_USER || 'adba_user',
        password: process.env.DB_MYSQL_PASSWORD || (() => { throw new Error('DB_MYSQL_PASSWORD required') })(),
        database: process.env.DB_MYSQL_DATABASE || 'adba_test',
      },
    };
  }

  if (dbKey === 'postgres') {
    return {
      name: 'PostgreSQL',
      client: 'pg',
      connection: {
        host: process.env.DB_POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.DB_POSTGRES_PORT || '5433'),
        user: process.env.DB_POSTGRES_USER || 'adba_user',
        password: process.env.DB_POSTGRES_PASSWORD || (() => { throw new Error('DB_POSTGRES_PASSWORD required') })(),
        database: process.env.DB_POSTGRES_DATABASE || 'adba_test',
      },
    };
  }

  if (dbKey === 'mssql') {
    return {
      name: 'MSSQL',
      client: 'mssql',
      connection: {
        server: process.env.DB_MSSQL_HOST || 'localhost',
        port: parseInt(process.env.DB_MSSQL_PORT || '1434'),
        user: process.env.DB_MSSQL_USER || 'sa',
        password: process.env.DB_MSSQL_PASSWORD || (() => { throw new Error('DB_MSSQL_PASSWORD required') })(),
        database: process.env.DB_MSSQL_DATABASE || 'adba_test',
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
      },
    };
  }

  throw new Error(`Unknown database: ${dbKey}`);
}

export interface TestApp {
  name: string;
  app: express.Application;
  knex: Knex;
  baseUrl: string;
}

export async function createTestApp(dbKey: string): Promise<TestApp> {
  const config = getDatabaseConfig(dbKey);

  console.log(`Creating test app for ${config.name}...`);

  const knexInstance = knex({
    client: config.client,
    connection: config.connection,
    useNullAsDefault: true,
  });

  try {
    await knexInstance.schema.dropTableIfExists('users');
  } catch (e) { /* ignore */ }
  try {
    await knexInstance.schema.dropTableIfExists('products');
  } catch (e) { /* ignore */ }

  await knexInstance.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 100);
    table.string('email', 255);
    table.integer('age');
    table.boolean('active');
    table.decimal('balance', 10, 2);
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name', 200);
    table.text('description');
    table.decimal('price', 10, 2);
    table.integer('stock');
    table.boolean('available');
  });

  await knexInstance('users').insert([
    { name: 'John Doe', email: 'john@example.com', age: 30, active: true, balance: 100.50 },
    { name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true, balance: 200.75 },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: false, balance: 50.00 },
  ]);

  await knexInstance('products').insert([
    { name: 'Laptop', description: 'High-end laptop', price: 999.99, stock: 10, available: true },
    { name: 'Mouse', description: 'Wireless mouse', price: 29.99, stock: 50, available: true },
    { name: 'Keyboard', description: 'Mechanical keyboard', price: 89.99, stock: 0, available: false },
  ]);

  const models = await generateModels(knexInstance);
  const routes = routesObject(models);
  const router = expressRouter(routes);

  const app = express();
  app.use(express.json());
  app.use(`/api/${dbKey}`, router);

  return {
    name: config.name,
    app,
    knex: knexInstance,
    baseUrl: `/api/${dbKey}`,
  };
}

export async function cleanupTestApp(testApp: TestApp): Promise<void> {
  await testApp.knex.destroy();
}