import knexLib, { Knex } from 'knex';
import moment from 'moment';
import { requireEnv } from '../../src/env-validator';

const DEFAULT_CONFIG = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_MYSQL_HOST || 'localhost',
    port: parseInt(process.env.DB_MYSQL_PORT || '3307'),
    user: process.env.DB_MYSQL_USER || 'adba_user',
    password: requireEnv('DB_MYSQL_PASSWORD'),
    database: process.env.DB_MYSQL_DATABASE || 'adba_test',
  },
  pool: { min: 2, max: 10 },
};

export async function createMysqlDatabase(): Promise<Knex> {
  const knex = knexLib(DEFAULT_CONFIG);

  await knex.schema.dropTableIfExists('test-one');
  await knex.schema.dropTableIfExists('test_two');
  await knex.schema.dropTableIfExists('__testables');

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

    await knex('test-one').insert([
      {
        id: 1,
        name: 'Name 1',
        active: 1,
        integer_column: 1,
        text_column: 'Text Example 1',
        real_column: 23.45,
        boolean_column: true,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 15.67,
        string_column: 'Sample String 1',
        blob_column: Buffer.from('Sample Blob 1'),
      },
      {
        id: 2,
        name: 'Name 2',
        active: 1,
        integer_column: 2,
        text_column: 'Text Example 2',
        real_column: 34.56,
        boolean_column: false,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 75.25,
        string_column: 'Sample String 2',
        blob_column: Buffer.from('Sample Blob 2'),
      },
      {
        id: 3,
        name: 'Name 3',
        active: 1,
        integer_column: 3,
        text_column: 'Text Example 3',
        real_column: 34.56,
        boolean_column: false,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 75.25,
        string_column: 'Sample String 3',
        blob_column: Buffer.from('Sample Blob 3'),
      }
    ]);

    await knex('test_two').insert([
      {
        id: 1,
        active: 1,
        integer_column: 3,
        text_column: 'Text Example 3',
        real_column: 45.67,
        boolean_column: true,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 95.11,
        string_column: 'Sample String 3',
        blob_column: Buffer.from('Sample Blob 3'),
      },
    ]);

    await knex('__testables').insert([
      {
        id: 1,
        active: 1,
        integer_column: 4,
        text_column: 'Text Example 4',
        real_column: 56.78,
        boolean_column: false,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 125.82,
        string_column: 'Sample String 4',
        blob_column: Buffer.from('Sample Blob 4'),
      },
    ]);
  return knex;
}

export async function cleanupMysqlDatabase(knex: Knex): Promise<void> {
  try {
    await knex('test-one').del();
    await knex('test_two').del();
    await knex('__testables').del();
    await knex.destroy();
  } catch (e) {
    await knex.destroy();
  }
}

export default createMysqlDatabase;
