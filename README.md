# ADBA - Any DataBase to API

**Transform any SQL database into a complete REST API automatically!**

---

## Quick Navigation

| Topic | Description |
|-------|-------------|
| [Quick Start](#quick-start) | Get up and running in 5 minutes |
| [How to Query](#how-to-query) | GET, POST, body data, filters |
| [Services Generated](#services-generated) | Auto-generated endpoints per table |
| [Customizing Services](#customizing-services) | Includes, excludes, replace controllers/models |
| [Custom Controller Pattern](#custom-controller-pattern) | Wrapper pattern for controllers |
| [Custom Models](#custom-models) | Extend models with relations and custom columns |
| [Detailed API Reference](./API_REFERENCE.md) | Exhaustive input/output and schema specs |

**Detailed Docs:**
- [FILTERS.md](./FILTERS.md) - All filter operators and options
- [POSTMAN.md](./POSTMAN.md) - Postman collection examples

---

## Quick Start

```bash
npm install adba
```

```typescript
import express from 'express';
import Knex from 'knex';
import { expressRouter, routesObject, generateModels } from 'adba';

const app = express();
app.use(express.json());

const knex = Knex({
  client: 'sqlite3',
  connection: { filename: './database.db' },
  useNullAsDefault: true,
});

const start = async () => {
  const models = await generateModels(knex);
  const routes = routesObject(models);
  const router = expressRouter(routes, { debugLog: true });

  app.use('/api', router);
  app.listen(3000, () => console.log('API running on http://localhost:3000/api'));
};

start();
```

**That's it!** Your database tables are now REST endpoints.

---

## How to Query

### Request Structure

All requests accept JSON body. Query params can use **dot notation** or **bracket notation**:

```
GET  /api/table/?filters.age.$gte=25&limit=10
POST /api/table/?orderBy=created_at:desc
```

### GET - List Records

```bash
# Basic list
GET /api/users/

# Pagination
GET /api/users/?limit=20&page=0

# Search (all text columns)
GET /api/users/?q=john

# Filters (dot notation)
GET /api/users/?filters.active=true
GET /api/users/?filters.age.$gte=18
GET /api/users/?filters.status.$in=admin,moderator
```

### POST - Advanced Filtering (Body)

Use POST for complex queries in the body:

```bash
POST /api/users/
Content-Type: application/json

{
  "filters": { "active": true, "age": { "$gte": 18, "$lt": 65 } },
  "orderBy": { "created_at": "desc" },
  "limit": 50,
  "page": 0,
  "q": "search term"
}
```

### PUT - Create Records

```bash
# Single record
PUT /api/users/
{ "insert": { "name": "John", "email": "john@example.com" } }

# Multiple records
PUT /api/users/
{ "insert": [
  { "name": "John", "email": "john@example.com" },
  { "name": "Jane", "email": "jane@example.com" }
] }
```

### PATCH - Update Records

```bash
# By ID in URL
PATCH /api/users/123
{ "name": "Updated Name" }

# Batch update (requires id field)
PATCH /api/users/
{ "update": { "id": 1, "name": "Updated" } }

# Multiple records
PATCH /api/users/
{ "update": [
  { "id": 1, "name": "Update 1" },
  { "id": 2, "name": "Update 2" }
] }
```

### DELETE - Remove Records

```bash
# By ID
DELETE /api/users/123

# With filters
DELETE /api/users/?filters.active=false
```

---

## Services Generated

For **each table** in your database, ADBA generates these endpoints:

| Method | Endpoint | Action | Description |
|--------|----------|--------|-------------|
| GET | `/table/` | list | List with pagination, search, filters |
| POST | `/table/` | list | Advanced filtering via body |
| PUT | `/table/` | insert | Create single or batch records |
| PATCH | `/table/` | update | Batch update (upsert) |
| DELETE | `/table/` | delete | Batch delete with filters |
| GET | `/table/:id` | selectById | Get record by numeric ID |
| GET | `/table/:name` | selectByName | Get record by name/string field |
| GET | `/table/meta` | meta | Table schema and column info |
| PATCH | `/table/:id` | update | Update specific record |
| DELETE | `/table/:id` | delete | Delete by ID |
| GET | `/` | - | List all available tables |

### Response Format

```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 0,
  "description": "ok",
  "data": {
    "total": 100,
    "data": [...],
    "limit": 20,
    "page": 0
  }
}
```

---

## Customizing Services

### Include/Exclude Tables

By default, all tables are exposed. Control which tables are available:

```typescript
// EXCLUDE mode: only specified tables are included
const routes = routesObject(models, controllers, {
  filters: {
    defaultAction: 'excludes',
    users: { '*': true },           // Only users table
    products: { '*': true }         // Only products table
  }
});

// INCLUDE mode: all tables except specified (default)
const routes = routesObject(models, controllers, {
  filters: {
    defaultAction: 'includes',
    '*': true,                       // Include all by default
    sensitive_data: false,           // Exclude this table
    logs: { 'DELETE': false }        // Disable DELETE for logs
  }
});
```

### Disable Specific Methods

```typescript
// Disable DELETE for admin tables
filters: {
  admin_users: {
    'DELETE': false,
    'PATCH': false
  }
}
```

### Replace Generic Controller

For custom behavior across all tables:

```typescript
import { replaceGenericController, Controller } from 'adba';

class MyController extends Controller {
  list(search, queryBuilder) {
    // Add default ordering
    search.orderBy = search.orderBy || { created_at: 'desc' };
    return super.list(search, queryBuilder);
  }
}

replaceGenericController(MyController);
```

---

## Custom Controller Pattern

Create table-specific controllers using the factory pattern:

```typescript
import { Controller } from 'adba';

export const createUserController = (UserModel) =>
  class UserController extends Controller {
    constructor() {
      super(UserModel);
    }

    async list(search, queryBuilder) {
      // Custom: eager load relations
      const query = queryBuilder?.clone() || this.Model.query();
      return super.list(search, query.withGraphFetched('profile'));
    }

    async update(data) {
      // Custom: validate before update
      if (data.update?.id) {
        data.update.id = Number(data.update.id);
      }
      return super.update(data);
    }
  };
```

**Usage with models:**

```typescript
import { getModels } from './models';
import { createUserController } from './controllers/user-controller';
import { routesObject } from 'adba';

const models = await getModels(knex);
const UserController = createUserController(models.UserTableModel);

const routes = routesObject(models, {
  UserController
}, {
  customController: {
    users: 'UserController'  // Use custom controller for users table
  }
});
```

---

## Custom Models

### Generate Models with Relations

```typescript
const models = await generateModels(knex, {
  relationsFunc: (tableName, relations) => {
    if (tableName === 'orders') {
      return {
        ...relations,
        customer: {
          relation: Model.BelongsToOneRelation,
          modelClass: () => models.CustomersTableModel,
          join: { from: 'orders.customer_id', to: 'customers.id' }
        },
        items: {
          relation: Model.HasManyRelation,
          modelClass: () => models.OrderItemsTableModel,
          join: { from: 'orders.id', to: 'order_items.order_id' }
        }
      };
    }
    return relations;
  },
  columnsFunc: (tableName, columns) => {
    if (tableName === 'users') {
      return {
        ...columns,
        created_at: { ...columns.created_at, label: 'Creation Date' }
      };
    }
    return columns;
  }
});
```

### Access Models

```typescript
// Get individual model
const UserModel = models.UserTableModel;

// Query with relations
const user = await UserModel.query().withGraphFetched('orders').findById(1);

// Create with relation
await UserModel.query().insertGraph({
  name: 'John',
  orders: [{ total: 100 }]
});
```

---

## Database Support

| Database | Client | Connection Example |
|----------|--------|-------------------|
| SQLite | sqlite3 | `{ filename: './db.sqlite' }` |
| MySQL | mysql2 | `{ host, port, user, password, database }` |
| PostgreSQL | pg | `{ host, port, user, password, database }` |
| MSSQL | mssql | `{ server, port, user, password, database }` |

---

## Full Example

```typescript
import express from 'express';
import Knex from 'knex';
import { generateModels, routesObject, expressRouter, Controller } from 'adba';

const app = express();
app.use(express.json());

// Custom controller factory
const createProductController = (ProductModel) =>
  class ProductController extends Controller {
    constructor() {
      super(ProductModel, { searchIn: ['name', 'description'] });
    }
  };

// Setup
const knex = Knex({ client: 'sqlite3', connection: { filename: './db.sqlite' } });
const models = await generateModels(knex);

// Create controller
const ProductController = createProductController(models.ProductsTableModel);

// Build routes
const routes = routesObject(models, { ProductController }, {
  filters: {
    defaultAction: 'includes',
    '*': true,
    logs: false  // Exclude logs table
  }
});

const router = expressRouter(routes, { debugLog: true });
app.use('/api', router);
app.listen(3000);
```

**API Available at:**
- `GET /api/products/` - List products
- `GET /api/users/` - List users
- `GET /api/` - All available endpoints

---

See [FILTERS.md](./FILTERS.md) for detailed filter operators and examples.