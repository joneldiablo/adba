import fs from 'fs';
import Knex from 'knex';
import moment from 'moment';

// Function to set up the database and insert test data
async function setupDatabase() {
  const dbFile = ':memory:';
  //const dbFile: string = 'tmp/test.db';
  if (dbFile !== ':memory:' && fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }
  const knexInstance = Knex({
    client: 'sqlite3',
    connection: {
      filename: dbFile,
    },
    useNullAsDefault: true,
  });

  // Create tables
  await knexInstance.schema.createTable('test-one', (table) => {
    table.increments('id').primary();
    table.integer('integer_column');
    table.text('text_column');
    table.specificType('real_column', 'REAL');
    table.boolean('boolean_column');
    table.datetime('datetime_column');
    table.decimal('decimal_column', 10, 2);
    table.string('string_column', 255);
    table.specificType('blob_column', 'BLOB');
  });

  await knexInstance.schema.createTable('test_two', (table) => {
    table.increments('id').primary();
    table.integer('integer_column');
    table.text('text_column');
    table.specificType('real_column', 'REAL');
    table.boolean('boolean_column');
    table.datetime('datetime_column');
    table.decimal('decimal_column', 10, 2);
    table.string('string_column', 255);
    table.specificType('blob_column', 'BLOB');
  });

  await knexInstance.schema.createTable('__testables', (table) => {
    table.increments('id').primary();
    table.integer('integer_column');
    table.text('text_column');
    table.specificType('real_column', 'REAL');
    table.boolean('boolean_column');
    table.datetime('datetime_column');
    table.decimal('decimal_column', 10, 2);
    table.string('string_column', 255);
    table.specificType('blob_column', 'BLOB');
  });

  // Insert test data into 'test-one'
  await knexInstance('test-one').insert([
    {
      id: 1,
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
      integer_column: 2,
      text_column: 'Text Example 2',
      real_column: 34.56,
      boolean_column: false,
      datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
      decimal_column: 75.25,
      string_column: 'Sample String 2',
      blob_column: Buffer.from('Sample Blob 2'),
    }
  ]);

  // Insert test data into 'test_two'
  await knexInstance('test_two').insert([
    {
      id: 1,
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

  // Insert test data into '__testables'
  await knexInstance('__testables').insert([
    {
      id: 1,
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

  return knexInstance;
}

export default setupDatabase;
