import { JSONSchema, Model, RelationMappings } from "objection";
import { ITableColumn } from "./model-utilities";

import Controller from "./controller";

export type IValueTypes = "string" | "boolean" | "number" | "array" | "object";

export type IRuleAction =
  | ":remove"
  | ":replace"
  | ":jsonStr"
  | ":jsonObj"
  | ":datetime"
  | ":date"
  | ":time"
  | ":booleanStr"
  | ":join"
  | ":join:tab"
  | ":join:nl"
  | ":join:|"
  | ":boolean"
  | ":sortAsc"
  | ":sortDesc";

export type IRule = IValueTypes | boolean | IRuleAction;

export type IRuleArray = [
  IRule,
  undefined | IRuleAction | IRules,
  (
    | undefined
    | ((colName: string, value: any, data: { [key: string]: any }) => any)
  )
];

export type IRules = { [key: string]: IRule | IRuleArray };

export type IExtraRules = { [key: string]: (value: any) => any };

export type IStatusCode = {
  error: boolean;
  success: boolean;
  status: number;
  code: number;
  description: string;
  data?: any;
};

export type IIncludes = string | string[];

export type IRouterMethods = "get" | "post" | "patch" | "delete" | "put";

export type IControllerMethods =
  | "list"
  | "selectById"
  | "insert"
  | "update"
  | "delete"
  | "meta";

export type IRoutesObject = Record<
  string,
  [
    "GET" | "POST" | "DELETE" | "PATCH" | "PUT",
    string,
    string,
    typeof Controller,
    typeof Model
  ]
>;

export interface IBaseConfFilters {
  defaultAction: "includes" | "excludes";
}

export interface IRouteConf
  extends IBaseConfFilters,
    Record<string, boolean | string> {}

export interface IFilterConf
  extends IBaseConfFilters,
    Record<string, string | boolean | IRouteConf> {}

export type ICustomEndpoints = Record<string, Record<string, string>>;

export type IExpressRouterConf = {
  filters?: IFilterConf;
  customEndpoints?: ICustomEndpoints;
};

export type ISearch = {
  filters: Record<string, any>;
  orderBy: Record<string, string>;
  fields?: string | string[];
  limit?: boolean | number;
  offset?: number;
  page?: number;
  q?: string;
};

export type IIds = {
  id?: number | number[];
  ids?: number | number[];
};

export type IGenerateModelsOptions = {
  relationsFunc?: (
    tableName: string,
    relations: RelationMappings
  ) => RelationMappings;
  squemaFixings?: (
    tableName: string,
    schema: Record<string, JSONSchema>
  ) => Record<string, JSONSchema>;
  columnsFunc?: (
    tableName: string,
    columns: Record<string, ITableColumn>
  ) => Record<string, ITableColumn>;
  parseFunc?: (tableName: string, json: any) => any;
  formatFunc?: (tableName: string, json: any) => any;
};
