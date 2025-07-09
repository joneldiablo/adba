import express from 'express';
import { Model } from 'objection';

import { getModelByTableName, className } from '../src/model-utilities';
import { listRoutes } from '../src/express-router';
import getStatusCode, { addStatusCodes } from '../src/status-codes';

describe('Utility functions', () => {
  class DummyModel extends Model {
    static tableName = 'dummy_table';
  }
  const models = { DummyModel };

  test('getModelByTableName returns correct model', () => {
    const result = getModelByTableName('dummy_table', models);
    expect(result).toBe(DummyModel);
  });

  test('className converts to PascalCase', () => {
    expect(className('dummy_table-name')).toBe('DummyTableName');
  });

  test('listRoutes returns registered routes', () => {
    const router = express.Router();
    const fooHandler = (_req: express.Request, res: express.Response) => res.send('foo');
    const barHandler = (_req: express.Request, res: express.Response) => res.send('bar');
    router.get('/foo', fooHandler as any);
    router.post('/bar', barHandler as any);
    expect(listRoutes(router)).toEqual(expect.arrayContaining(['GET /foo', 'POST /bar']));
  });

  test('status code helpers', () => {
    const ok = getStatusCode(200);
    expect(ok.status).toBe(200);
    addStatusCodes([{ status: 299, code: 1, description: 'weird', error: false, success: true }]);
    const custom = getStatusCode(299, 1);
    expect(custom.description).toBe('weird');
  });
});
