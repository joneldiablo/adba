import express from 'express';
import expressRouter, { routesObject, addTableAlias, modifyDefinedRoutes, listRoutes } from '../src/express-router';
import Controller from '../src/controller';
import { Model } from 'objection';

describe('express router helpers', () => {
  class TestModel extends Model { static tableName = 'util_table'; }
  class TestController extends Controller { constructor(){ super(TestModel);} }
  const models = { TestModel };
  const controllers = { TestController } as any;

  afterEach(() => {
    // clean added routes and alias
    modifyDefinedRoutes(['GET /extra'], true);
    addTableAlias({ util_table: 'util-table' }); // reset alias to same name
  });

  it('modifyDefinedRoutes adds and removes routes', () => {
    modifyDefinedRoutes({ 'GET /extra': 'list' });
    const ro = routesObject(models, { testCtrl: TestController } as any, {});
    expect(ro).toHaveProperty('GET /util-table/extra');
    modifyDefinedRoutes(['GET /extra'], true);
    const ro2 = routesObject(models, { testCtrl: TestController } as any, {});
    expect(ro2).not.toHaveProperty('GET /util-table/extra');
  });

  it('listRoutes retrieves router paths', () => {
    const ro = routesObject(models, { testCtrl: TestController } as any, {});
    const router = express.Router();
    const configured = expressRouter(ro, { router });
    const list = listRoutes(configured);
    expect(list).toContain('GET /');
    expect(list.some(r=>r.includes('/util-table/'))).toBe(true);
  });
});
