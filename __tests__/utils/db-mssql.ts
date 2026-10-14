import knexLib, { Knex } from 'knex';
import moment from 'moment';
import { requireEnv } from '../../src/env-validator';

const DEFAULT_CONFIG = {
  client: 'mssql',
  connection: {
    server: process.env.DB_MSSQL_HOST || 'localhost',
    port: parseInt(process.env.DB_MSSQL_PORT || '1434'),
    user: process.env.DB_MSSQL_USER || 'sa',
    password: requireEnv('DB_MSSQL_PASSWORD'),
    database: process.env.DB_MSSQL_DATABASE || 'adba_test',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  },
  pool: { min: 2, max: 10 },
};

// MSSQL: las columnas `id` son IDENTITY. Para sembrar valores explícitos hay
// que habilitar IDENTITY_INSERT, y el SET + INSERT deben correr en el MISMO
// batch (si no, knex/tedious los ejecuta en sesiones distintas y el SET se pierde).
async function seedWithIdentity(
  knex: Knex,
  table: string,
  rows: Record<string, any>[]
): Promise<void> {
  const { sql, bindings } = knex(table).insert(rows).toSQL();
  await knex.raw(
    `SET IDENTITY_INSERT [${table}] ON; ${sql}; SET IDENTITY_INSERT [${table}] OFF;`,
    bindings
  );
}

export async function createMssqlDatabase(): Promise<Knex> {
  const knex = knexLib(DEFAULT_CONFIG);

  await knex.schema.dropTableIfExists('test-one');
  await knex.schema.dropTableIfExists('test_two');
  await knex.schema.dropTableIfExists('__testables');

  {
    await knex.schema.createTable('test-one', (table) => {
      table.increments('id').primary();
      table.integer('active').defaultTo(1);
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());
      table.string('name');
      table.text('description');
      table.integer('created_by');
      table.integer('grouped_by');
      table.integer('owner');
      table.integer('integer_column');
      table.text('text_column');
      table.float('real_column');
      table.boolean('boolean_column');
      table.datetime('datetime_column');
      table.decimal('decimal_column', 10, 2);
      table.string('string_column', 255);
      table.binary('blob_column');
    });

    await knex.schema.createTable('test_two', (table) => {
      table.increments('id').primary();
      table.integer('active').defaultTo(1);
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());
      table.string('name');
      table.text('description');
      table.integer('created_by');
      table.integer('grouped_by');
      table.integer('owner');
      table.integer('integer_column');
      table.text('text_column');
      table.float('real_column');
      table.boolean('boolean_column');
      table.datetime('datetime_column');
      table.decimal('decimal_column', 10, 2);
      table.string('string_column', 255);
      table.binary('blob_column');
    });

    await knex.schema.createTable('__testables', (table) => {
      table.increments('id').primary();
      table.integer('active').defaultTo(1);
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());
      table.string('name');
      table.text('description');
      table.integer('created_by');
      table.integer('grouped_by');
      table.integer('owner');
      table.integer('integer_column');
      table.text('text_column');
      table.float('real_column');
      table.boolean('boolean_column');
      table.datetime('datetime_column');
      table.decimal('decimal_column', 10, 2);
      table.string('string_column', 255);
      table.binary('blob_column');
    });

    await seedWithIdentity(knex, 'test-one', [
      {
        id: 1,
        active: 1,
        integer_column: 1,
        text_column: 'Text Example 1',
        real_column: 23.45,
        boolean_column: 1,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 15.67,
        string_column: 'Sample String 1',
        blob_column: Buffer.from('Sample Blob 1'),
      },
      {
        id: 2,
        active: 1,
        integer_column: 2,
        text_column: 'Text Example 2',
        real_column: 34.56,
        boolean_column: 0,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 75.25,
        string_column: 'Sample String 2',
        blob_column: Buffer.from('Sample Blob 2'),
      },
      {
        id: 3,
        active: 1,
        integer_column: 3,
        text_column: 'Text Example 3',
        real_column: 34.56,
        boolean_column: 0,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 75.25,
        string_column: 'Sample String 3',
        blob_column: Buffer.from('Sample Blob 3'),
      }
    ]);

    await seedWithIdentity(knex, 'test_two', [
      {
        id: 1,
        active: 1,
        integer_column: 3,
        text_column: 'Text Example 3',
        real_column: 45.67,
        boolean_column: 1,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 95.11,
        string_column: 'Sample String 3',
        blob_column: Buffer.from('Sample Blob 3'),
      },
    ]);

    await seedWithIdentity(knex, '__testables', [
      {
        id: 1,
        active: 1,
        integer_column: 4,
        text_column: 'Text Example 4',
        real_column: 56.78,
        boolean_column: 0,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 125.82,
        string_column: 'Sample String 4',
        blob_column: Buffer.from('Sample Blob 4'),
      },
    ]);
  }

  return knex;
}

export async function cleanupMssqlDatabase(knex: Knex): Promise<void> {
  try {
    await knex('test-one').del();
    await knex('test_two').del();
    await knex('__testables').del();
    await knex.destroy();
  } catch (e) {
    await knex.destroy();
  }
}

export default createMssqlDatabase;
