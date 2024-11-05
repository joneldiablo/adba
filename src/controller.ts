import { Model, QueryBuilderType, JSONSchema, WhereMethod } from 'objection';

import type { IIds, ISearch } from './types';
import getStatusCode from './status-codes';

export default class Controller {

  Model: typeof Model;
  qcolumns: string[] | undefined;

  constructor(SqliteModel: typeof Model, options: { searchIn?: string[] } = {}) {
    this.Model = SqliteModel;
    this.qcolumns = options?.searchIn;
  }

  public findTypeString(ModelIn: typeof Model = this.Model) {
    const properties = ModelIn.jsonSchema.properties;
    const stringFields = [];

    for (const key in properties) {
      const field: JSONSchema = properties[key] as JSONSchema;
      if (field.type === 'string') {
        stringFields.push(key);
      }
    }

    return stringFields;
  }

  public list(dataSearch: ISearch, queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
    queryBuilderIn.clear(true);
    const ModelInUse = queryBuilder?._modelClass || this.Model;
    const {
      filters, orderBy = {},
      fields: rawFields,
      limit: rawLimit,
      offset: rawOffset,
      page: rawPage,
      q
    } = dataSearch;
    let limit: number;
    let offset: number;
    let page: number;
    // pagination
    if (rawLimit !== false) {
      limit = !rawLimit || rawLimit === true ? 20 : rawLimit;
      offset = rawOffset || ((rawPage || 0) * limit) || 0;
      page = rawPage || Math.trunc(offset / limit) || 0;
    }
    // fields or columns to return by row
    const fields = new Set();
    const fieldsReq = !rawFields ? [] :
      Array.isArray(rawFields)
        ? rawFields
        : rawFields.split(',');
    fieldsReq.forEach((f: string) => fields.add(f.trim()));

    if (fields.size) {
      fields.add(ModelInUse.tableName + '.id');
      const finalFields = Array.from(fields);
      queryBuilderIn.select(finalFields);
    }

    // omni search
    if (typeof q === 'string') {
      const tableName = ModelInUse.tableName + '.';
      const query = q.replace(/(['\\])/g, '\\$1');
      const columns = Array.isArray(this.qcolumns) ? [...this.qcolumns] : this.findTypeString(ModelInUse);
      // ordering template
      const locateOrder = `WHEN {{column}} = '${query}' THEN 0 WHEN {{column}} LIKE '${query}%' THEN 1 WHEN {{column}} LIKE '%${query}' THEN 4`;
      const regexColumn = /\{\{column\}\}/g;
      const order: string[] = [];
      const orWhereClauses: [string, string, string][] = [];
      columns.map((column) => {
        // INFO: Ibidem
        const orderClause: [string, string, string] = [
          column.includes('.') ? column : tableName + column,
          'like', `%${query}%`
        ];
        orWhereClauses.push(orderClause);
        const orderString = locateOrder.replace(regexColumn, (column.includes('.') ? column : tableName + column));
        order.push(orderString);
      });
      // filter by *q* parametter
      queryBuilderIn.where((builder: QueryBuilderType<any>) => {
        orWhereClauses.forEach(w => builder.orWhere(...w));
      });
      // set order string builded
      if (!Object.keys(orderBy).length) {
        queryBuilderIn.orderByRaw('CASE ' + order.join(' ') + ' ELSE 3 END');
      }
    }

    const entriesOrderBy = Object.keys(orderBy);
    if (entriesOrderBy.length) {
      const [col, dir] = entriesOrderBy.pop()!;
      if (col.includes('.')) queryBuilderIn.orderBy(col, dir);
      else queryBuilderIn.orderBy(`${ModelInUse.tableName}.${col}`, dir);
    }

    // Search by column
    if (typeof filters === 'object') {
      queryBuilderIn.where((builder: QueryBuilderType<any>) => {
        Object.keys(filters).forEach((col) => {
          const tableColumn = col.includes('.') ? col : ModelInUse.tableName + '.' + col;
          const search = filters[col];
          if (Array.isArray(search)) {
            // INFO: Si el campo es de tipo string, usar whereIn, 
            //       en otro caso, whereBetween.
            const where = ModelInUse.jsonSchema
              .properties[col].type === 'string' ||
              search.length > 2 ? 'whereIn' : 'whereBetween';
            builder[where](tableColumn, search);
          } else if (ModelInUse.jsonSchema.properties[col]) {
            if (ModelInUse.jsonSchema.properties[col].type === 'string') {
              builder.where(tableColumn, 'like', '%' + search + '%');
            } else if (['number', 'integer', 'float', 'decimal']
              .includes(ModelInUse.jsonSchema.properties[col].type)) {
              builder.where(tableColumn, Number(search));
            } else {
              builder.where(tableColumn, search);
            }
          } else {
            builder.where(tableColumn, 'like', '%' + search + '%');
          }
        });
      });
    }

    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);

    let response;
    if (!!limit!) {
      response = queryBuilderIn.page(page!, limit)
        .then((r: any) => ({
          total: r.total,
          data: r.results,
          limit,
          offset,
          page
        }));
    } else {
      response = queryBuilderIn.then((data: object[]) => ({
        total: data.length,
        data,
        limit,
        offset: offset || 0,
        page
      }));
    }

    return response
      .then((resp: object[]) => this.successMerge(resp))
      .catch((error: Error) => this.error(error));

  }

  public selectById({ id }: IIds, queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
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

  public selectOneActive(find: object, queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
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

  public selectOne(find: object, queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
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

  public insert(data: object | object[], queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.insertGraph(data, { allowRefs: true });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  public update(data: object | object[], queryBuilder?: QueryBuilderType<any>) {
    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.upsertGraph(data, { allowRefs: true });
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  public deleteWhere(whereData: WhereMethod<any>, queryBuilder?: QueryBuilderType<any>) {

    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.delete().where(whereData);
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }
  public delete({ id, ids }: IIds, queryBuilder?: QueryBuilderType<any>) {

    const queryBuilderIn = queryBuilder ? queryBuilder.clone() : this.Model.query();
    queryBuilderIn.clear(true);
    queryBuilderIn.delete().whereIn('id', [id, ids].flat().filter(Boolean));
    if (queryBuilder) queryBuilderIn.copyFrom(queryBuilder, true);
    return queryBuilderIn
      .then((resp: any) => this.success(resp))
      .catch((error: Error) => this.error(error));
  }

  protected success(data?: any, status = 200, code = 0) {
    const toReturn = Object.assign(
      { error: false, success: true },
      getStatusCode(status, code),
      { data }
    );
    return toReturn;
  }

  protected successMerge(data?: any, status = 200, code = 0) {
    const toReturn = Object.assign(
      { error: false, success: true },
      getStatusCode(status, code),
      data
    );
    return toReturn;
  }

  protected error(errorObj?: any, status = 500, code = 0) {
    let toReturn;
    if (errorObj instanceof Error) {
      //TODO: implements datetime format whit space, stringify and split in lines, and if the objet its an error
      console.error(errorObj);
      toReturn = Object.assign(
        { error: true, success: false, },
        getStatusCode(500, 0),
        { data: errorObj.message }
      );
    } else {
      toReturn = Object.assign(
        { error: true, success: false },
        getStatusCode(status, code),
        { data: errorObj }
      );
    }
    return toReturn;
  }

}
