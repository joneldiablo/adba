# Any DataBase to API

Generate API REST from any SQL DataBase

[![Documentation](https://img.shields.io/badge/docs-view-green.svg)](https://joneldiablo.github.io/adba/modules.html)

## DataBases

- SQLite
- MySQL
- PostgreSQL
- MSSQL

## Features

- Generate Objection.js models from your database using `generateModels`.
- Build an Express router with full CRUD routes via `routesObject` and `expressRouter`.
- `GET /` on the router lists all registered routes for quick discovery.
- Each table additionally exposes `GET /<table>/meta` returning its JSON schema and converted `columns`.
- Configure which tables and methods are exposed and alias table names as needed.
- Add custom endpoints through the `customEndpoints` option passed to `routesObject`.
- Customize generated JSON schema, relations and columns via hooks in `generateModels`.
- Apply multi-column ordering to queries using the controller's `orderBy` support.
- Utility helpers cover status codes, data formatting, encryption/token helpers and email sending.
- Create SQL dump files of your database via `dumpDatabase`.

## TODO

- test on PostgreSQL
- test on MSSQL
- [ ] Implement integration tests for PostgreSQL database (see postgres-connection.test.ts)
- [ ] Implement integration tests for MSSQL database (see mssql-connection.test.ts)

## Example

```ts
import express from 'express';
import Knex from 'knex';
import morgan from 'morgan';
import cors from 'cors';

import { expressRouter, routesObject, generateModels } from 'adba';

// Config Knex for SQLite
const knexInstance = Knex({
  client: 'sqlite3',
  connection: {
    filename: './mydbsqlite.db'
  },
  useNullAsDefault: true,
});


const startServer = async () => {
  const app = express();
  const port = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  const models = await generateModels(knexInstance);

  // build the routes using only the generated models, easy easy
  const myRoutesObject = routesObject(models);

  // Use the router, you can add midlewares to
  const router = expressRouter(myRoutesObject, { debugLog: process.env.ENV !== 'PROD' });
  app.use('/api', router);

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/api`);
  });
};

startServer().catch(err => console.error(err));
```

## Generated Endpoints

ADBA automatically generates RESTful endpoints for each table in your database:

### Standard CRUD Operations
- `GET /table/` - List records with pagination, filtering, and search
- `POST /table/` - List records (alternative with request body)
- `PUT /table/` - Create new records
- `PATCH /table/` - Update records
- `DELETE /table/` - Delete records

### ID-based Operations
- `GET /table/:id` - Get record by numeric ID
- `PATCH /table/:id` - Update record by ID
- `DELETE /table/:id` - Delete record by ID

### Name-based Operations ⭐ **NEW**
- `GET /table/:name` - Get record by name field

### Meta Information
- `GET /table/meta` - Get table schema and metadata
- `GET /` - List all available endpoints

### Examples
```bash
# List users with pagination
GET /users/?limit=10&page=0

# Search users by text
GET /users/?q=john

# Filter active users
GET /users/?filters[active]=true

# Get user by ID
GET /users/123

# Get user by name (NEW!)
GET /users/john-doe

# Get table metadata
GET /users/meta
```

## Adding custom endpoints

`routesObject` accepts a `customEndpoints` option where you can define arbitrary routes bound to your controllers. The object keys are base paths and each contains HTTP method/path strings mapped to `ControllerName.action`.

```ts
const customRoutes = routesObject(models, controllers, {
  customEndpoints: {
    custom: {
      'GET /': 'testController.customAction',
      'PUT /:id': 'testController.updateAction'
    }
  }
});
```

The above configuration generates `/custom/` and `/custom/:id` endpoints and they will appear in the root route list like any other service.

## Customizing generated models

`generateModels` accepts optional hooks to modify the generated metadata.

```ts
const models = await generateModels(knexInstance, {
  squemaFixings: (table, schema) => {
    if (table === 'users') {
      return { extra_field: { type: 'string' } };
    }
  },
  relationsFunc: (table, relations) => {
    if (table === 'users' && models.ProfileTableModel) {
      relations.profile = {
        relation: Model.HasOneRelation,
        modelClass: models.ProfileTableModel,
        join: { from: 'users.id', to: 'profiles.user_id' }
      };
    }
    return relations;
  },
  columnsFunc: (table, columns) => {
    if (table === 'users') {
      columns.created_at = { ...columns.created_at, label: 'Created' };
    }
    return columns;
  }
});
```

## Database dump

`dumpDatabase` generates two files in a directory of your choice: one with only
the schema and another with schema plus data. It relies on the corresponding
CLI tools (`mysqldump`, `pg_dump` or `sqlite3`) being available.

```ts
await dumpDatabase(knexInstance, './dumps');
// => { schemaFile: './dumps/schema.sql', fullFile: './dumps/schema_data.sql' }
```
## Data formatting

Use `formatData` to transform objects based on simple rules. Add custom rule handlers with `addRuleActions`.

```ts
import { formatData, addRuleActions } from "adba";

addRuleActions({
  ":upper": (v) => String(v).toUpperCase(),
});

const res = formatData({ name: "john", age: 30 }, { name: ["string", ":upper"], age: "number" });
// res => { name: "JOHN", age: 30 }
```


## Meta endpoints

Each generated table also exposes `GET /<table>/meta`. This endpoint returns the
table name, its JSON schema and a `columns` object derived from that schema. The
metadata can be used to dynamically render a table in the UI.

```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 0,
  "description": "ok",
  "data": {
    "tableName": "my_table",
    "jsonSchema": {
      "type": "object"
    },
    "columns": {
      "id": {
        "name": "id",
        "label": "id",
        "type": "integer",
        "required": true
      }
    }
  }
}
```

## 🚀 Quick Testing with Postman

ADBA includes a complete **Postman collection** for instant API testing! No need to create requests manually.

### Features:
- ✅ **All endpoints included**: List, Get by ID, Get by Name, Create, Update, Delete, Meta
- ✅ **Fully configurable**: Just set `{{baseUrl}}` and `{{tableName}}` variables
- ✅ **Works with any table**: Automatically adapts to your database schema
- ✅ **Ready-to-use examples**: Pre-filled request bodies and parameters

### Quick Setup:
1. Import `postman-collection.json` into Postman
2. Set environment variables:
   - `baseUrl`: Your API URL (e.g., `http://localhost:3000/api`)
   - `tableName`: Table to test (e.g., `users`, `products`)
3. Start testing immediately!

📖 **Full Postman guide**: See [POSTMAN.md](./POSTMAN.md) for detailed instructions.

## Documentation

For a detailed description of each module and function, visit the [full documentation](https://joneldiablo.github.io/adba/modules.html) **automagically** generated with Typedoc. The documentation includes usage examples and in-depth explanations of each function.
