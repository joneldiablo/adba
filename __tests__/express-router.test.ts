import express from 'express';
import expressRouter, {
  routesObject,
  addTableAlias,
  modifyDefinedRoutes,
} from '../src/express-router';
import Controller from '../src/controller';
import { Model } from 'objection';

describe('express-router integration', () => {
  class TestModel extends Model {
    static tableName = 'test_table';
    static jsonSchema = { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } };
  }

  class CustomController extends Controller {
    constructor() {
      super(TestModel as any);
    }
  }

  class TestController extends Controller {
    constructor() {
      super(TestModel as any);
    }
    async customAction() {}
    async updateAction() {}
  }

  const models = { TestModel } as any;
  const mockControllers: Record<string, any> = { testController: CustomController };
  const mockConfig: any = {};

  afterEach(() => {
    // reset any aliases or added routes
    modifyDefinedRoutes(['GET /extra'], true);
    addTableAlias({ test_table: 'test-table' });
  });

  it('should return the correct routes object', () => {
    const result = routesObject(models, mockControllers, mockConfig);
    expect(result).toHaveProperty('GET /test-table/');
    expect(result).toHaveProperty('GET /test-table/:id(\\d+)');
    expect(result).toHaveProperty('GET /test-table/meta');
  });

  it('should throw an error if model is not found', () => {
    const invalidConfig: any = {
      filters: { defaultAction: 'excludes', non_existent_table: true },
    };
    expect(() => routesObject(models, mockControllers, invalidConfig)).toThrow();
  });

  it('should not create routes for excluded tables', () => {
    const invalidConfig: any = { filters: { defaultAction: 'includes', non_existent_table: true } };
    const r = routesObject(models, mockControllers, invalidConfig);
    expect(r).not.toHaveProperty('GET /non-existent-table/');
  });

  it('should respect method filters and aliases', () => {
    const discartConfig: any = { filters: { defaultAction: 'includes', test_table: { defaultAction: 'excludes', 'GET /': true, 'GET /:id(\\d+)': true, 'GET /meta': true } } };
    const result = routesObject(models, mockControllers, discartConfig);
    expect(result).toHaveProperty('GET /test-table/');
    expect(result).not.toHaveProperty('POST /test-table/');
  });

  it('should allow modifying delete behavior', () => {
    const discartConfig: any = {
      filters: {
        defaultAction: 'includes',
        test_table: { defaultAction: 'includes', 'GET /': false, 'GET /:id(\\d+)': false, 'GET /meta': false, 'DELETE /': 'deleteWhere', 'DELETE /:id(\\d+)': 'deleteWhere' },
      },
    };
    const result = routesObject(models, mockControllers, discartConfig);
    expect(result).toHaveProperty('DELETE /test-table/');
  });

  it('should return alias routes when alias is set', () => {
    addTableAlias({ test_table: 'alias-for-table' });
    const result = routesObject(models, mockControllers, mockConfig);
    expect(result).toHaveProperty('GET /alias-for-table/');
  });

  it('should include custom endpoints', () => {
    const cfg: any = { customEndpoints: { custom: { 'GET /': 'testController.customAction', 'PUT /:id(\\d+)': 'testController.updateAction' } } };
    const result = routesObject(models, { testController: TestController } as any, cfg);
    expect(result).toHaveProperty('GET /custom/');
    expect(result).toHaveProperty('PUT /custom/:id(\\d+)');
  });
});
