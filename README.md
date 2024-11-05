# Any DataBase to API

Generate API REST from any SQL DataBase

## DataBases

- MSSQL
- MySQL
- PostgreSQL
- SQLite

## TODO

- test on MSSQL
- test on PostgreSQL

## example

```ts
import express from 'express';
import Knex from 'knex';
import morgan from 'morgan';
import cors from 'cors';

import { expressRouter, routesObject, generateSQLiteModels } from 'adba';

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

  const models = await generateSQLiteModels(knexInstance);

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
