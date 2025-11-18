/**
 * @file express-router.ts
 * @description This file provides functionalities for creating an Express router with dynamic routes based on ORM models.
 */

import { Model } from "objection";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import moment from "moment";
import { kebabCase } from "change-case-all";
import { v4 as uuidv4 } from "uuid";

import { unflatten } from "dbl-utils";

import type {
  IControllerMethods,
  IExpressRouterConf,
  IRouteConf,
  IRoutesObject,
  IStatusCode,
  IRouterMethods,
  ICustomEndpoints,
} from "./types";
import GenericController from "./controller";
import Controller from "./controller";
import getStatusCode from "./status-codes";

const ctrlRef = {
  GenericController,
};

const aliasing: Record<string, string> = {};

/**
 * Predefined RESTful routes mapped to controller actions.
 */
const definedREST: Record<string, string> = {
  "GET /": "list",
  "POST /": "list",
  "PUT /": "insert",
  "PATCH /": "update",
  "DELETE /": "delete",
  "GET /meta": "meta",
  //wildcards
  "GET /:name([\\w\\-\\d]+)": "selectByName",
  "GET /:id(\\d+)": "selectById",
  "PATCH /:id(\\d+)": "update",
  "DELETE /:id(\\d+)": "delete",
};

/**
 * Modifies predefined routes by either adding new ones or removing existing ones.
 * @param defs - The definitions to be added or removed.
 * @param remove - Whether to remove the definitions.
 */
export function modifyDefinedRoutes(
  defs: Record<string, string> | string[],
  remove: boolean = false
) {
  if (remove && Array.isArray(defs)) {
    defs.forEach((k: string) => delete definedREST[k]);
  } else {
    Object.assign(definedREST, defs);
  }
}

/**
 * Adds alias mappings for table names.
 * @param alias - The alias mappings.
 */
export function addTableAlias(alias: Record<string, string>) {
  Object.assign(aliasing, alias);
}

/**
 * Prepares the routes object by building route entries for each model.
 * @param routesObj - The routes object to populate.
 * @param TheModel - The model for which to create routes.
 * @param controllers - The controllers associated with the models.
 * @param includeTable - Whether to include the table in route definitions.
 */
function prepareRoutesObj(
  routesObj: IRoutesObject,
  TheModel: typeof Model,
  controllers: Record<string, typeof Controller>,
  includeTable: boolean | IRouteConf
) {
  if (includeTable === false) return;
  const tableName = TheModel.tableName;
  const TheController =
    Object.values(controllers).find((C) => {
      const ctrl = new C(Model);
      return ctrl.Model.tableName === tableName;
    }) || ctrlRef.GenericController;

  if (includeTable === true) {
    Object.entries(definedREST).forEach(([service, action]) => {
      buildRoutesObj(
        routesObj,
        tableName,
        service,
        action,
        TheController,
        TheModel
      );
    });
    return;
  }

  const { defaultAction = "includes", ...rest } = includeTable;
  if (defaultAction === "excludes") {
    Object.entries(rest).forEach(([service, action]) => {
      if (!action) return;
      if (action === true) action = definedREST[service];
      buildRoutesObj(
        routesObj,
        tableName,
        service,
        action as string,
        TheController,
        TheModel
      );
    });
  } else {
    const cpRest = { ...rest };
    Object.entries(definedREST).forEach(([service, action]) => {
      if (rest[service] === false) {
        delete cpRest[service];
        return;
      }
      if (typeof rest[service] === "string") {
        action = rest[service];
        delete cpRest[service];
      }
      buildRoutesObj(
        routesObj,
        tableName,
        service,
        action,
        TheController,
        TheModel
      );
    });
    // Add custom routes not defined in definedREST
    Object.entries(cpRest).forEach(([service, action]) => {
      if (!action) return;
      if (action === true) action = definedREST[service];
      buildRoutesObj(
        routesObj,
        tableName,
        service,
        action as string,
        TheController,
        TheModel
      );
    });
  }
}

/**
 * Constructs the routes object with respective service paths, actions, and controllers.
 * @param routesObj - Object to store constructed routes.
 * @param tableName - The table name for the model.
 * @param service - The HTTP method and endpoint.
 * @param action - The action to be performed.
 * @param TheController - The controller class.
 * @param TheModel - The model class.
 */
function buildRoutesObj(
  routesObj: IRoutesObject,
  tableName: string,
  service: string,
  action: string,
  TheController: typeof Controller,
  TheModel: typeof Model
) {
  const [m, path] = service.split(" ");
  const slugTableName = aliasing[tableName] || kebabCase(tableName);
  const method = m.toUpperCase() as IRoutesObject[1][0];
  const servicePath = `/${slugTableName}${path}`;
  routesObj[`${method} ${servicePath}`] = [
    method,
    servicePath,
    action,
    TheController,
    TheModel,
  ];
}

/**
 * Generates an object containing routes for each model and controller based on provided configuration.
 * @param models - The models to generate routes for.
 * @param controllers - The associated controllers for each model.
 * @param config - The configuration for including or excluding routes.
 * @returns The constructed routes object.
 */
export function routesObject(
  models: Record<string, typeof Model>,
  controllers: Record<string, typeof ctrlRef.GenericController> = {},
  config: IExpressRouterConf = {}
) {
  const routesObj: IRoutesObject = {};
  if (config.filters) {
    const { defaultAction = "includes", ...rest } = config.filters;
    if (defaultAction === "excludes") {
      Object.entries(rest).forEach(([tableName, includeTable]) => {
        if (!includeTable) return;
        const TheModel = Object.values(models).find(
          (M) => M.tableName === tableName
        );
        if (!TheModel) throw new Error(`Model for **${tableName}** Not Found`);
        prepareRoutesObj(routesObj, TheModel, controllers, includeTable as any);
      });
    } else {
      // Include logic
      Object.values(models).forEach((TheModel) => {
        const includeTable =
          rest[TheModel.tableName] !== undefined
            ? rest[TheModel.tableName]
            : rest["*"] !== undefined
            ? rest["*"]
            : true;
        prepareRoutesObj(routesObj, TheModel, controllers, includeTable as any);
      });
    }
  } else {
    Object.values(models).forEach((TheModel) => {
      prepareRoutesObj(routesObj, TheModel, controllers, true);
    });
  }

  if (config.customEndpoints) {
    Object.entries(config.customEndpoints).forEach(([basePath, endpoints]) => {
      const cleanBase = basePath.replace(/^\/+|\/+$/g, "");
      Object.entries(endpoints as Record<string, string>).forEach(
        ([service, handler]) => {
          const [controllerName, action] = handler.split(".");
          const TheController = controllers[controllerName];
          if (!TheController) return;
          const [m, p] = service.split(" ");
          const method = m.toUpperCase() as IRoutesObject[1][0];
          const servicePath = `/${cleanBase}${p}`;
          routesObj[`${method} ${servicePath}`] = [
            method,
            servicePath,
            action,
            TheController,
            Model,
          ];
        }
      );
    });
  }
  return routesObj;
}

/**
 * Lists the routes currently defined in the Express router.
 * @param router - The Express router.
 * @returns An array of strings representing each route method and path.
 */
export function listRoutes(router: express.Router) {
  const routes: string[] = [];
  router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // It's a defined route
      const method = Object.keys(middleware.route.methods)[0].toUpperCase();
      const routePath = middleware.route.path;
      routes.push(`${method} ${routePath}`);
    }
  });
  return routes;
}

/**
 * Replaces the default GenericController with custom controller reference.
 * @param CustomController - A Class Controller extends from the original GenericController.
 */
export function replaceGenericController(
  CustomController: typeof GenericController
) {
  ctrlRef.GenericController = CustomController;
  return true;
}

/**
 * Main function to configure an Express router with dynamic routes.
 * @param routesObject - The routes object containing route definitions.
 * @param config - Configuration options for the router.
 * @returns The configured Express router.
 */
export default function expressRouter(
  routesObject: IRoutesObject,
  {
    router = express.Router(),
    beforeProcess = (tn: string, a: string, data: any, i: string) => data,
    afterProcess = (tn: string, a: string, data: any, i: string) => data,
    debugLog = false,
  } = {}
) {
  Object.values(routesObject).forEach((value: IRoutesObject[1]) => {
    const [method, path, action, TheController, TheModel] = value;
    const routerMethod =
      router[method.toLowerCase() as IRouterMethods].bind(router);
    routerMethod(
      path,
      async (req: Request, res: Response, next: NextFunction) => {
        const protocol = req.protocol;
        const host = req.get("host");

        const _idx = uuidv4();
        console.log("");
        console.log("");
        console.time(_idx);
        console.group(moment().format("YYYY-MM-DD HH:mm:ss"));
        console.log(
          _idx,
          ">",
          `${method} ${protocol}://${host}${req.originalUrl}`,
          Controller.name,
          action
        );

        if (debugLog) {
          console.debug("HEADERS", req.headers);
          console.debug("PARAMS", req.params);
          console.debug("QUERY", req.query);
          console.debug("BODY", req.body);
          console.debug("COOKIES", req.cookies);
        }

        try {
          const controller = new TheController(TheModel);
          const all = {
            ...(req.body || {}),
            ...unflatten(req.query || {})!,
            ...(req.params || {}),
          };
          const ctrlAction: Function =
            controller[action as IControllerMethods].bind(controller);
          const inputData = await beforeProcess(
            controller.Model.tableName,
            action,
            all,
            _idx
          );
          const outputData = await ctrlAction(inputData);
          const payload = await afterProcess(
            controller.Model.tableName,
            action,
            outputData,
            _idx
          );
          payload.requestId = _idx;

          // Check if the output data is an error or if it needs a special response
          if (payload instanceof Error) throw payload;
          if (!payload) throw getStatusCode(503);
          else res.status(payload.status).json(payload);

          if (debugLog) {
            console.debug("RESPONSE", payload);
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(error);
            const e: any = error;
            const code = e.statusCode || e.code || 0;
            const payload = getStatusCode(500, code);
            payload.data = error.message;
            res.status(500).json(payload);
          } else if (typeof (error as IStatusCode).status === "number") {
            res.status((error as IStatusCode).status).json(error);
          }
        }

        console.timeEnd(_idx);
        console.groupEnd();
      }
    );
  });

  // Setup a default GET route that lists all available routes
  router.get("/", (req, res) => {
    const availableRoutes = listRoutes(router);
    const success = getStatusCode(200);
    success.data = availableRoutes;
    res.status(success.status!).json(success);
  });

  return router;
}
