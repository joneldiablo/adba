import { Model } from "objection";
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { unflatten } from 'flat';
import moment from 'moment';
import { kebabCase } from "change-case-all";
import { v4 as uuidv4 } from 'uuid';

import GenericController from "./controller";
import Controller from "./controller";
import getStatusCode, { IStatusCode } from "./status-codes";

type IIncludes = string | string[];
type RouterMethods = 'get' | 'post' | 'patch' | 'delete' | 'put';
type ControllerMethods = 'list'
  | 'selectById'
  | 'insert'
  | 'update'
  | 'delete';
export type IRoutesObject = Record<string, [
  'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT',
  string, string, typeof Controller, typeof Model]>;

export interface IBaseConfFilters {
  defaultAction: 'includes' | 'excludes';
}
export interface IRouteConf extends IBaseConfFilters, Record<string, boolean | string> { }
export interface IFilterConf extends IBaseConfFilters, Record<string, string | boolean | IRouteConf> { }
export type IExpressRouterConf = {
  filters?: IFilterConf
}

const aliasing: Record<string, string> = {};

const definedREST: Record<string, string> = {
  'GET /': 'list',
  'POST /': 'list',
  'PUT /': 'insert',
  'PATCH /': 'update',
  'DELETE /': 'delete',
  'GET /:id': 'selectById',
  'PATCH /:id': 'update',
  'DELETE /:id': 'delete',
};

export function modifyDefinedRoutes(defs: Record<string, string> | string[], remove: boolean = false) {
  if (remove && Array.isArray(defs)) {
    defs.forEach((k: string) => (delete definedREST[k]));
  } else {
    Object.assign(definedREST, defs);
  }
}

export function addAlias(alias: Record<string, string>) {
  Object.assign(aliasing, alias);
}


function prepareRoutesObj(
  routesObj: IRoutesObject, TheModel: typeof Model,
  controllers: Record<string, typeof Controller>, includeTable: boolean | IRouteConf
) {
  if (includeTable === false) return;
  const tableName = TheModel.tableName;
  const TheController = Object.values(controllers).find(C => {
    const ctrl = new C(Model);
    return ctrl.Model.tableName === tableName;
  }) || GenericController;
  if (includeTable === true) {
    Object.entries(definedREST).forEach(([service, action]) => {
      buildRoutesObj(routesObj, tableName, service, action, TheController, TheModel);
    });
    return;
  }
  const { defaultAction = 'includes', ...rest } = includeTable;
  if (defaultAction === 'excludes') {
    Object.entries(rest).forEach(([service, action]) => {
      if (!action) return;
      if (action === true) action = definedREST[service];
      buildRoutesObj(routesObj, tableName, service, action as string, TheController, TheModel);
    });
  } else {
    const cpRest = { ...rest };
    Object.entries(definedREST).forEach(([service, action]) => {
      if (rest[service] === false) {
        delete cpRest[service];
        return;
      }
      if (typeof rest[service] === 'string') {
        action = rest[service];
        delete cpRest[service];
      }
      buildRoutesObj(routesObj, tableName, service, action, TheController, TheModel);
    });
    //custom out of the definedREST
    Object.entries(cpRest).forEach(([service, action]) => {
      if (!action) return;
      if (action === true) action = definedREST[service];
      buildRoutesObj(routesObj, tableName, service, action as string, TheController, TheModel);
    });
  }
}

function buildRoutesObj(
  routesObj: IRoutesObject, tableName: string,
  service: string, action: string,
  TheController: typeof Controller,
  TheModel: typeof Model
) {
  const [m, path] = service.split(' ');
  const slugTableName = aliasing[tableName] || kebabCase(tableName);
  const method = m.toUpperCase() as IRoutesObject[1][0];
  const servicePath = `/${slugTableName}${path}`;
  routesObj[`${method} ${servicePath}`] = [method, servicePath, action, TheController, TheModel];
}

export function routesObject(models: Record<string, typeof Model>, controllers: Record<string, typeof GenericController> = {}, config: IExpressRouterConf = {}) {
  const routesObj: IRoutesObject = {};
  if (config.filters) {
    const { defaultAction = 'includes', ...rest } = config.filters;
    if (defaultAction === 'excludes') {
      Object.entries(rest).forEach(([tableName, includeTable]) => {
        if (!includeTable) return;
        const TheModel = Object.values(models).find(M => M.tableName === tableName);
        if (!TheModel) throw new Error(`Model for **${tableName}** Not Found`);
        prepareRoutesObj(routesObj, TheModel, controllers, includeTable as any);
      });
    }
    //includes!!!
    else {
      Object.values(models).forEach(TheModel => {
        const includeTable = rest[TheModel.tableName] !== undefined
          ? rest[TheModel.tableName]
          : (rest['*'] !== undefined ? rest['*'] : true);
        prepareRoutesObj(routesObj, TheModel, controllers, includeTable as any);
      });
    }
  } else {
    Object.values(models).forEach(TheModel => {
      prepareRoutesObj(routesObj, TheModel, controllers, true);
    });
  }
  return routesObj;
}

export function listRoutes(router: express.Router) {
  const routes: string[] = [];
  router.stack.forEach((middleware: any) => {
    if (middleware.route) { // Es una ruta definida
      const method = Object.keys(middleware.route.methods)[0].toUpperCase();
      const routePath = middleware.route.path;
      routes.push(`${method} ${routePath}`);
    }
  });
  return routes;
}

export default function expressRouter(routesObject: IRoutesObject, {
  router = express.Router(),
  beforeProcess = (tn: string, a: string, data: any, i: string) => data,
  afterProcess = (tn: string, a: string, data: any, i: string) => data,
  debugLog = false
} = {}) {
  Object.values(routesObject).forEach((value: IRoutesObject[1]) => {
    const [method, path, action, TheController, TheModel] = value;
    const routerMethod = (router[method.toLowerCase() as RouterMethods]).bind(router);
    routerMethod(path, async (req: Request, res: Response, next: NextFunction) => {
      const protocol = req.protocol;
      const host = req.get('host');

      const _idx = uuidv4();
      console.log('');
      console.log('');
      console.time(_idx);
      console.group(moment().format('YYYY-MM-DD HH:mm:ss'));
      console.log(_idx, '>', `${method} ${protocol}://${host}${req.originalUrl}`, Controller.name, action);

      if (debugLog) {
        console.debug('HEADERS', req.headers);
        console.debug('PARAMS', req.params);
        console.debug('QUERY', req.query);
        console.debug('BODY', req.body);
        console.debug('COOKIES', req.cookies);
      }

      try {
        const controller = new TheController(TheModel);
        const all = {
          ...req.body || {},
          ...unflatten(req.query || {})!,
          ...req.params || {},
        }
        const ctrlAction: Function = controller[action as ControllerMethods].bind(controller);
        const inputData = await beforeProcess(controller.Model.tableName, action, all, _idx);
        const outputData = await ctrlAction(inputData);
        const payload = await afterProcess(controller.Model.tableName, action, outputData, _idx);
        if (payload instanceof Error) throw payload;
        if (!payload) throw getStatusCode(503);
        else res.status(payload.status).json(payload);
        if (debugLog) {
          console.debug('RESPONSE', payload);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(error);
          const e: any = error;
          const code = e.statusCode || e.code || 0;
          const payload = getStatusCode(500, code);
          payload.data = error.message;
          res.status(500).json(payload);
        } else if (typeof (error as IStatusCode).status === 'number') {
          res.status((error as IStatusCode).status).json(error);
        }
      }
      console.timeEnd(_idx);
      console.groupEnd();
    })
  });
  router.get('/', (req, res) => {
    const availableRoutes = listRoutes(router);
    const success = getStatusCode(200);
    success.data = availableRoutes;
    res.status(success.status).json(success);
  });
  return router;
}