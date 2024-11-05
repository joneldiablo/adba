import type { Knex } from 'knex';
import setupDatabase from './utils/db-sqlite';

describe('SQLite Database Tests', () => {
  let knexInstance: Knex;

  beforeAll(async () => {
    knexInstance = await setupDatabase();
  });

  afterAll(async () => {
    await knexInstance.destroy();
  });

  test('table "test-one" should exist', async () => {
    const exists = await knexInstance.schema.hasTable('test-one');
    expect(exists).toBe(true);
  });
  test('table "test_two" should exist', async () => {
    const exists = await knexInstance.schema.hasTable('test_two');
    expect(exists).toBe(true);
  });
  test('table "__testables" should exist', async () => {
    const exists = await knexInstance.schema.hasTable('__testables');
    expect(exists).toBe(true);
  });

  test('table "test-one" should have all expected columns', async () => {
    const columns = [
      'id',
      'integer_column',
      'text_column',
      'real_column',
      'boolean_column',
      'datetime_column',
      'decimal_column',
      'string_column',
      'blob_column',
    ];

    for (const column of columns) {
      const exists = await knexInstance.schema.hasColumn('test-one', column);
      expect(exists).toBe(true);
    }
  });
});
