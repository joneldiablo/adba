import type { Knex } from 'knex';
import type { Model } from 'objection';
import setupDatabase from './utils/db-sqlite';
import { generateModels } from '../src/utils/generate-models';

describe('SQLite Database Tests', () => {
  let knexInstance: Knex;
  let models: Record<string, typeof Model>;

  beforeAll(async () => {
    knexInstance = await setupDatabase();
    models = await generateModels(knexInstance);
  });

  afterAll(async () => {
    await knexInstance.destroy();
  });

  test('4 models should exist', async () => {
    const modelNames = Object.keys(models);
    expect(modelNames.length).toBe(4);
  });

  test('test-one jsonschema should be equal', async () => {
    const jsonschema = {
      type: 'object',
      properties: {
        id: { type: 'integer', $comment: 'integer' },
        integer_column: { type: 'integer', $comment: 'integer' },
        text_column: { type: 'string', $comment: 'string' },
        real_column: { type: 'number', $comment: 'number' },
        boolean_column: { type: 'boolean', $comment: 'boolean' },
        datetime_column: { type: 'string', $comment: 'string.datetime' },
        decimal_column: { type: 'number', $comment: 'number' },
        string_column: { type: 'string', $comment: 'string', maxLength: 255 },
        'x-blob_column': { $comment: 'buffer' },
      },
      required: ['id']
    }
    expect(models.TestOneTableModel.jsonSchema).toEqual(jsonschema);
  });

});