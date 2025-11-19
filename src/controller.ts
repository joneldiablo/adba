import { Model, QueryBuilderType, JSONSchema, WhereMethod } from "objection";

import { deepMerge } from "dbl-utils";

import type { IIds, ISearch, IStatusCode } from "./types";
import getStatusCode from "./status-codes";
import { jsonSchemaToColumns } from "./model-utilities";

/**
 * @class Controller
 *
 * @description
 * A controller class for handling database queries using Objection.js models.
 */
export default class Controller {
  Model: typeof Model;
  qcolumns: string[] | undefined;

  /**
   * @constructor
   *
   * @param {typeof Model} SqliteModel - The Objection.js model.
   * @param {Object} options - Additional options for the controller.
   * @param {string[]} [options.searchIn] - Columns to search in by default.
   */
  constructor(
    SqliteModel: typeof Model,
    options: { searchIn?: string[] } = {}
  ) {
    this.Model = SqliteModel;
    this.qcolumns = options?.searchIn;
  }

  /**
   * Finds string type columns in the model's JSON schema.
   *
   * @param {typeof Model} ModelIn - The model to inspect. Defaults to this.Model.
   * @returns {string[]} A list of string type column names.
   */
  public findTypeString(ModelIn: typeof Model = this.Model): string[] {
    const properties = ModelIn.jsonSchema.properties;
    const stringFields = [];
    for (const key in properties) {
      const field: JSONSchema = properties[key] as JSONSchema;
      if (field.type === "string") {
        stringFields.push(key);
      }
    }
    return stringFields;
  }

  /**
   * Lists records based on search criteria.
   *
   * @param {ISearch} dataSearch - The search criteria.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public list(
    dataSearch: ISearch,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    const ModelInUse = queryBuilder?._modelClass || this.Model;
    const {
      filters,
      orderBy = {},
      fields: rawFields,
      limit: rawLimit,
      offset: rawOffset,
      page: rawPage,
      q,
    } = dataSearch;
    let limit: number;
    let offset: number;
    let page: number;

    // Set pagination defaults
    if (rawLimit !== false) {
      limit = !rawLimit || rawLimit === true ? 20 : rawLimit;
      offset = rawOffset || (rawPage || 0) * limit || 0;
      page = rawPage || Math.trunc(offset / limit) || 0;
    }

    // Columns to return
    const fields = new Set();
    const fieldsReq = !rawFields
      ? []
      : Array.isArray(rawFields)
      ? rawFields
      : rawFields.split(",");
    fieldsReq.forEach((f: string) => fields.add(f.trim()));

    if (fields.size) {
      fields.add(ModelInUse.tableName + ".id");
      const finalFields = Array.from(fields);
      queryBuilderIn.select(finalFields);
    }

    // Omni search
    if (typeof q === "string") {
      const tableName = ModelInUse.tableName + ".";
      const query = q.replace(/(['\\])/g, "\\$1");
      const columns = Array.isArray(this.qcolumns)
        ? [...this.qcolumns]
        : this.findTypeString(ModelInUse);
      const locateOrder = `WHEN {{column}} = '${query}' THEN 0 WHEN {{column}} LIKE '${query}%' THEN 1 WHEN {{column}} LIKE '%${query}' THEN 4`;
      const regexColumn = /\{\{column\}\}/g;
      const order: string[] = [];
      const orWhereClauses: [string, string, string][] = [];

      columns.map((column) => {
        const orderClause: [string, string, string] = [
          column.includes(".") ? column : tableName + column,
          "like",
          `%${query}%`,
        ];
        orWhereClauses.push(orderClause);
        const orderString = locateOrder.replace(
          regexColumn,
          column.includes(".") ? column : tableName + column
        );
        order.push(orderString);
      });

      queryBuilderIn.where((builder: QueryBuilderType<any>) => {
        orWhereClauses.forEach((w) => builder.orWhere(...w));
      });

      if (!Object.keys(orderBy).length) {
        queryBuilderIn.orderByRaw("CASE " + order.join(" ") + " ELSE 3 END");
      }
    }

    this.applyOrderByLite(queryBuilderIn, orderBy);

    // Filtering by columns
    if (typeof filters === "object") {
      queryBuilderIn.where((builder: QueryBuilderType<any>) => {
        Object.keys(filters).forEach((col) => {
          const tableColumn = col.includes(".")
            ? col
            : ModelInUse.tableName + "." + col;
          const search = filters[col];

          // Support operator objects, e.g. { age: { $gte: 18, $lt: 65 } }
          if (search && typeof search === "object" && !Array.isArray(search)) {
            const prop = (ModelInUse.jsonSchema && ModelInUse.jsonSchema.properties && (ModelInUse.jsonSchema.properties as any)[col]) || {};
            const isNumeric = ["number", "integer", "float", "decimal"].includes(prop.type);

            Object.entries(search).forEach(([op, val]) => {
              // Normalize single values for numeric columns
              const value = isNumeric && !Array.isArray(val) ? Number(val) : val;
              switch (op) {
                case "$gte":
                  builder.where(tableColumn, ">=", value);
                  break;
                case "$gt":
                  builder.where(tableColumn, ">", value);
                  break;
                case "$lte":
                  builder.where(tableColumn, "<=", value);
                  break;
                case "$lt":
                  builder.where(tableColumn, "<", value);
                  break;
                case "$ne":
                  builder.where(tableColumn, "<>", value);
                  break;
                case "$in":
                  builder.whereIn(tableColumn, Array.isArray(value) ? value : [value]);
                  break;
                case "$nin":
                  builder.whereNotIn(tableColumn, Array.isArray(value) ? value : [value]);
                  break;
                case "$between":
                  if (Array.isArray(value) && value.length === 2) builder.whereBetween(tableColumn, value);
                  break;
                case "$nbetween":
                  if (Array.isArray(value) && value.length === 2) builder.whereNotBetween(tableColumn, value);
                  break;
                case "$like":
                  builder.where(tableColumn, "like", String(value));
                  break;
                case "$ilike":
                  // Use case-insensitive match where supported (Postgres); fallback to lower comparison
                  builder.whereRaw("LOWER(??) LIKE LOWER(?)", [tableColumn, String(value)]);
                  break;
                default:
                  // Unknown operator: fallback to equality
                  builder.where(tableColumn, value as any);
              }
            });
            return;
          }

          if (Array.isArray(search)) {
            const prop = (ModelInUse.jsonSchema && ModelInUse.jsonSchema.properties && (ModelInUse.jsonSchema.properties as any)[col]) || {};
            const where = prop.type === "string" || search.length > 2 ? "whereIn" : "whereBetween";
            builder[where](tableColumn, search as any);
          } else if (ModelInUse.jsonSchema && (ModelInUse.jsonSchema.properties as any)[col]) {
            const propType = (ModelInUse.jsonSchema.properties as any)[col].type;
            if (propType === "string") {
              builder.where(tableColumn, "like", "%" + search + "%");
            } else if (["number", "integer", "float", "decimal"].includes(propType)) {
              builder.where(tableColumn, Number(search));
            } else {
              builder.where(tableColumn, search as any);
            }
          } else {
            builder.where(tableColumn, "like", "%" + search + "%");
          }
        });
      });
    }

    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);

    let response;
    if (!!limit!) {
      response = queryBuilderIn.page(page!, limit).then((r: any) => ({
        total: r.total,
        data: r.results,
        limit,
        offset,
        page,
      }));
    } else {
      response = queryBuilderIn.then((data: object[]) => ({
        total: data.length,
        data,
        limit,
        offset: offset || 0,
        page,
      }));
    }

    return response
      .then((resp: object[]) => this.successMerge(resp))
      .catch((error: Error) => this.error(error));
  }

  /**
   * Applies multi-column ordering to an Objection or Knex query builder.
   *
   * Accepts an object like `{ created_at: 'desc', 'user.name': 'asc' }`.
   *
   * - Dotted paths (e.g. `user.name`) are used as provided. Ensure related
   *   tables have been joined via `joinRelated` or `withGraphJoined`.
   * - Columns without a dot are qualified with the model table name.
   * - Any invalid direction defaults to `'asc'`.
   *
   * @param queryBuilderIn - Query builder instance to apply ordering to.
   * @param orderBy - Mapping of column paths to sort direction.
   *
   * @example
   * ```ts
   * const query = SampleModel.query();
   * controller.applyOrderByLite(query, {
   *   created_at: 'desc',
   *   'profile.name': 'asc'
   * });
   * ```
   */
  applyOrderByLite(
    queryBuilderIn: any, // QueryBuilder
    orderBy: Record<string, string> = {}
  ): void {
    try {
      const entries = Object.entries(orderBy);
      if (!entries.length) return;

      for (const [col, rawDir] of entries) {
        // --- normalize direction to 'asc' | 'desc'
        const d = String(rawDir || "").toLowerCase();
        const dir: "asc" | "desc" = d === "desc" ? "desc" : "asc";

        // --- qualify column
        const qualified = col.includes(".")
          ? col
          : `${this.Model.tableName}.${col}`;

        // --- apply to query
        queryBuilderIn.orderBy(qualified, dir);
      }
    } catch (error: any) {
      switch (error?.message) {
        default: {
          console.error(
            "ERROR:",
            error,
            "---------------continue------------------"
          );
        }
      }
    }
  }

  /**
   * Selects a record by its ID.
   * @param {IIds} param0 - The ID or IDs to select.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public selectById(
    { id }: IIds,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.findById(id);
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((row: any) => {
        if (!row) return this.error(id, 404, 0);
        return this.success(row);
      })
      .catch((error: Error) => this.error(error));
  }

  /**
   * Selects one active record based on given criteria.
   * @param {object} find - Criteria to find the record.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public selectOneActive(
    find: object,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.findOne({ ...find, active: true });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((row: any) => {
        if (!row) return this.error(find, 404, 0);
        return this.success(row);
      })
      .catch((error: Error) => this.error(error));
  }

  /**
   * Selects one record based on given criteria without considering active state.
   * @param {object} find - Criteria to find the record.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public selectOne(
    find: object,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.findOne(find);
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((row: any) => {
        if (!row) return this.error(find, 404, 0);
        return this.success(row);
      })
      .catch((error: Error) => this.error(error));
  }

  /**
   * Selects one record by its name field.
   * @param {object} param0 - Object containing the name parameter.
   * @param {string} param0.name - The name to search for.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public selectByName(
    { name }: { name: string },
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    
    // Try to find a 'name' column first, if it doesn't exist use the first string column
    const schema = this.Model.jsonSchema;
    const properties = schema.properties || {};
    let nameColumn = 'name';
    
    if (!properties[nameColumn]) {
      // If 'name' column doesn't exist, find the first string column
      const stringColumns = this.findTypeString();
      nameColumn = stringColumns[0] || 'name'; // fallback to 'name' if no string columns
    }
    
    queryBuilderIn.findOne({ [nameColumn]: name });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((row: any) => {
        if (!row) return this.error({ [nameColumn]: name }, 404, 0);
        return this.success(row);
      })
      .catch((error: Error) => this.error(error));
  }

  /**
   * Inserts one or multiple records.
   *
   * @param {Record<string, any>} data - The data to insert.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public insert(
    data: Record<string, any>,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.insertGraph(data.insert, { allowRefs: true });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  /**
   * Updates records using an upsert operation.
   *
   * @param {Record<string, any>} data - The data for upsert.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public update(
    data: Record<string, any>,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.upsertGraph(data.update, { allowRefs: true });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  /**
   * Deletes records based on where clause.
   *
   * @param {WhereMethod<any>} whereData - Criteria for delete operation.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public deleteWhere(
    whereData: WhereMethod<any>,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.delete().where(whereData);
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  /**
   * Deletes records by ID(s).
   *
   * @param {IIds} param0 - The ID or IDs of records to delete.
   * @param {QueryBuilderType<any>} [queryBuilder] - Optional query builder instance.
   * @returns {Promise<object>} The promise of the resulting data.
   */
  public delete(
    { id, ids }: IIds,
    queryBuilder?: QueryBuilderType<any>
  ): Promise<IStatusCode> {
    const queryBuilderIn = queryBuilder
      ? queryBuilder.clone()
      : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.delete().whereIn("id", [id, ids].flat().filter(Boolean));
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  /**
   * Returns metadata information about the table.
   *
   * @returns {Promise<IStatusCode>} The promise with table metadata.
   */
  public async meta(): Promise<IStatusCode> {
    const { properties = {}, required = [] } = this.Model.jsonSchema as any;

    const columnsGetter = (this.Model as any).columns;
    const columns =
      typeof columnsGetter === "function"
        ? columnsGetter.call(this.Model)
        : jsonSchemaToColumns(properties, required as string[]);

    const data = {
      tableName: this.Model.tableName,
      jsonSchema: this.Model.jsonSchema,
      columns,
    };
    return this.success(data);
  }

  /**
   * Formats a successful response object.
   *
   * @param {any} data - The data to return in the response.
   * @param {number} [status=200] - The HTTP status code.
   * @param {number} [code=0] - Additional status code.
   * @returns {object} The success response object.
   */
  protected success(data?: any, status = 200, code = 0): IStatusCode {
    const toReturn = Object.assign(
      { error: false, success: true },
      getStatusCode(status, code),
      { data }
    ) as IStatusCode;
    return toReturn;
  }

  /**
   * Merges additional data into a successful response object.
   *
   * @param {any} data - The data to return in the response.
   * @param {number} [status=200] - The HTTP status code.
   * @param {number} [code=0] - Additional status code.
   * @returns {object} The merged success response object.
   */
  protected successMerge(data?: any, status = 200, code = 0): IStatusCode {
    const toReturn = Object.assign(
      { error: false, success: true },
      getStatusCode(status, code),
      data
    );
    return toReturn;
  }

  /**
   * Formats an error response object.
   *
   * @param {any} errorObj - The error object or message.
   * @param {number} [status=500] - The HTTP status code.
   * @param {number} [code=0] - Additional status code.
   * @returns {object} The error response object.
   */
  protected error(errorObj?: any, status = 500, code = 0): IStatusCode {
    let toReturn: IStatusCode;
    if (errorObj instanceof Error) {
      console.error(errorObj);
      toReturn = Object.assign(
        { error: true, success: false },
        getStatusCode(500, 0),
        { data: errorObj.message }
      ) as IStatusCode;
    } else {
      toReturn = Object.assign(
        { error: true, success: false },
        getStatusCode(status, code),
        { data: errorObj }
      ) as IStatusCode;
    }
    return toReturn;
  }
}
