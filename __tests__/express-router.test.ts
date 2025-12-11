import express from 'express';
import expressRouter, {
  routesObject,
  addTableAlias,
  modifyDefinedRoutes,
  generateServicesSummary,
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

  it('should generate services summary with one endpoint per service', () => {
    const routes = routesObject(models, mockControllers, mockConfig);
    const summary = generateServicesSummary(routes);
    
    // Should have exactly one entry for the service
    expect(Object.keys(summary)).toContain('test-table');
    
    // Should prefer GET method
    expect(summary['test-table']).toBe('GET /test-table');
  });

  it('should handle multiple services in summary', () => {
    class AnotherModel extends Model {
      static tableName = 'another_table';
      static jsonSchema = { type: 'object', properties: { id: { type: 'integer' } } };
    }

    const multiModels = { TestModel, AnotherModel } as any;
    const routes = routesObject(multiModels, mockControllers, mockConfig);
    const summary = generateServicesSummary(routes);
    
    // Should have entries for both tables
    expect(Object.keys(summary).length).toBeGreaterThanOrEqual(2);
    expect(summary).toHaveProperty('test-table');
    expect(summary).toHaveProperty('another-table');
  });

  it('should prefer GET method when multiple methods exist', () => {
    const routes: any = {
      'POST /test-service/': ['POST', '/test-service/', 'list', Controller, Model],
      'GET /test-service/': ['GET', '/test-service/', 'list', Controller, Model],
    };
    const summary = generateServicesSummary(routes);
    
    expect(summary['test-service']).toBe('GET /test-service');
  });

  it('should handle custom endpoints in summary', () => {
    const cfg: any = { customEndpoints: { custom: { 'GET /': 'testController.customAction', 'PUT /:id(\\d+)': 'testController.updateAction' } } };
    const routes = routesObject(models, { testController: TestController } as any, cfg);
    const summary = generateServicesSummary(routes);
    
    // Should include the custom endpoint service
    expect(summary).toHaveProperty('custom');
    expect(summary['custom']).toBe('GET /custom');
  });

  it('should return data structure with endpoints and tables arrays', () => {
    const routes = routesObject(models, mockControllers, mockConfig);
    const summary = generateServicesSummary(routes);
    const allRoutes = Object.keys(routes);
    
    // Verify the structure that would be returned by the root endpoint
    const data = {
      endpoints: allRoutes.map(k => {
        const route = routes[k];
        return `${route[0]} ${route[1]}`;
      }),
      tables: Object.keys(summary),
    };
    
    expect(data).toHaveProperty('endpoints');
    expect(data).toHaveProperty('tables');
    expect(Array.isArray(data.endpoints)).toBe(true);
    expect(Array.isArray(data.tables)).toBe(true);
    expect(data.endpoints.length).toBeGreaterThan(0);
    expect(data.tables.length).toBeGreaterThan(0);
  });

  it('should exclude custom endpoints from services summary', () => {
    const cfg: any = { customEndpoints: { custom: { 'GET /': 'testController.customAction', 'PUT /:id(\\d+)': 'testController.updateAction' } } };
    const routes = routesObject(models, { testController: TestController } as any, cfg);
    
    // Detect custom endpoints by checking if they use the generic Model class
    const customEndpointPaths = new Set<string>();
    Object.values(routes).forEach((value: any) => {
      const [, path, , , TheModel] = value;
      if (TheModel === Model) {
        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          customEndpointPaths.add(pathSegments[0]);
        }
      }
    });
    
    const summary = generateServicesSummary(routes, customEndpointPaths);
    
    // Custom endpoint should NOT be in the summary
    expect(summary).not.toHaveProperty('custom');
    
    // But table should be in the summary
    expect(summary).toHaveProperty('test-table');
  });
});
