import { Model } from 'objection';

import Controller from '../src/controller';
import { generateModels } from '../src/generate-models';

import setupDatabase from './utils/db-sqlite';

describe('TEST Controller on test-one table', () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestOneModel = models['TestOneTableModel'];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  test('findTypeString should return string fields from the model', () => {
    const result = apiController.findTypeString();
    expect(result).toEqual(['text_column', 'datetime_column', 'string_column']);
  });

  test('list should return data with pagination', async () => {
    const searchData = { filters: {}, orderBy: {}, limit: 10, page: 0 };
    const response = await apiController.list(searchData);
    expect(response.success).toBe(true);
    expect(response.data.length).toBeLessThanOrEqual(10);
  });

  test('selectById should return a row by ID', async () => {
    const response = await apiController.selectById({ id: 1 });
    expect(response.success).toBe(true);
    expect(response.data.id).toBe(1);
  });

  test('insert should add new data to the table', async () => {
    const newData = {
      id: 3,
      integer_column: 100,
      text_column: 'Test Insert',
      real_column: 99.99,
      boolean_column: true,
      datetime_column: new Date().toISOString(),
      decimal_column: 123.45,
      string_column: 'Insert Test',
      blob_column: Buffer.from('Hello Blob').toString('base64'),
    };

    const response = await apiController.insert(newData);
    expect(response.success).toBe(true);

    const checkResponse = await apiController.selectById({ id: response.data.id });
    expect(checkResponse.success).toBe(true);
    expect(checkResponse.data.text_column).toBe('Test Insert');
  });

  test('update should modify existing data', async () => {
    const updateData = {
      id: 1,
      text_column: 'Updated Text',
    };

    const response = await apiController.update(updateData);
    expect(response.success).toBe(true);

    const checkResponse = await apiController.selectById({ id: 1 });
    expect(checkResponse.success).toBe(true);
    expect(checkResponse.data.text_column).toBe('Updated Text');
  });

  test('delete should remove data by ID', async () => {
    const response = await apiController.delete({ id: 2 });
    expect(response.success).toBe(true);

    const checkResponse = await apiController.selectById({ id: 2 });
    expect(checkResponse.success).toBe(false);
  });
});
