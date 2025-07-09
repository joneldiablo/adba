# Any DataBase to API

Generate API REST from any SQL DataBase

[![Documentation](https://img.shields.io/badge/docs-view-green.svg)](https://joneldiablo.github.io/adba/modules.html)

## DataBases

- SQLite
- MySQL
- PostgreSQL
- MSSQL

## TODO

- test on PostgreSQL
- test on MSSQL

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

## Documentation

For a detailed description of each module and function, visit the [full documentation](https://joneldiablo.github.io/adba/modules.html) **automagically** generated with Typedoc. The documentation includes usage examples and in-depth explanations of each function.
