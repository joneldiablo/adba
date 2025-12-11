# Any DataBase to API

**🚀 Transform any SQL database into a complete REST API automatically!**

Generate full-featured API REST from any SQL DataBase with zero configuration.

[![Documentation](https://img.shields.io/badge/docs-view-green.svg)](https://joneldiablo.github.io/adba/modules.html)
[![npm version](https://badge.fury.io/js/adba.svg)](https://www.npmjs.com/package/adba)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/ESM-Compatible-green.svg)](https://nodejs.org/api/esm.html)

## 🎯 Supported Databases

- **SQLite** ✅ - File-based database, perfect for development
- **MySQL** ✅ - Popular open-source relational database
- **PostgreSQL** ✅ - Advanced open-source relational database
- **MSSQL** ✅ - Microsoft SQL Server database

## ⚡ Core Features

### 🔥 **Zero Configuration API Generation**
- **Automatic Model Generation**: Create Objection.js models from your database schema
- **Full CRUD REST API**: Complete Create, Read, Update, Delete endpoints
- **Intelligent Route Building**: Express router with automatic endpoint discovery
- **Schema Introspection**: Auto-detect table structures, relationships, and data types

### 🎛️ **Advanced Query Capabilities**
- **Pagination**: Built-in limit/offset pagination with total count
- **Text Search**: Full-text search across string columns with `q` parameter
- **Advanced Filtering**: Complex filtering with operators (`=`, `!=`, `>`, `<`, `>=`, `<=`)
- **Multi-Column Ordering**: Sort by multiple columns with custom direction
- **Active Record Pattern**: Built-in support for `active` field filtering

### 🔧 **Customization & Extensibility**
- **Custom Endpoints**: Add your own routes alongside auto-generated ones
- **Table Aliases**: Map table names to custom endpoint names
- **Method Control**: Enable/disable specific HTTP methods per table
- **Schema Hooks**: Customize generated JSON schemas and relationships
- **Middleware Support**: Add Express middleware to any endpoint

### 🛡️ **Security & Utilities**
- **Encryption/Decryption**: AES-256-CBC encryption utilities
- **Password Hashing**: bcrypt integration for secure password storage
- **JWT Token Management**: Token generation, verification, and validation
- **User Agent Detection**: Client type detection and device identification

### 📧 **Email System**
- **SMTP Integration**: Send emails via nodemailer
- **Template Engine**: Handlebars template support with MJML
- **Queue System**: Asynchronous email processing with retry logic
- **Template Management**: Reusable email templates with data binding

### 🗄️ **Database Management**
- **Schema Dumping**: Export database schema and data to SQL files
- **Connection Pooling**: Efficient database connection management
- **SSH Tunneling**: Secure database connections through SSH tunnels
- **Multi-Instance Support**: Connect to multiple databases simultaneously

### 📊 **Data Processing**
- **Format Data**: Transform objects with flexible rule-based formatting
- **Type Mapping**: Automatic SQL to JSON Schema type conversion
- **Status Codes**: Comprehensive HTTP status code management
- **Response Formatting**: Consistent API response structure

## 🚀 Quick Start

```bash
# Install ADBA
npm install adba
# or
yarn add adba
```

### Basic Setup (5 minutes)

```typescript
import express from 'express';
import Knex from 'knex';
import { expressRouter, routesObject, generateModels } from 'adba';

// 1. Configure your database connection
const knexInstance = Knex({
  client: 'sqlite3',
  connection: { filename: './database.db' },
  useNullAsDefault: true,
});

// 2. Create your API server
const startServer = async () => {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  
  // 3. Generate models from your database
  const models = await generateModels(knexInstance);
  
  // 4. Build routes automatically
  const myRoutes = routesObject(models);
  
  // 5. Create Express router
  const router = expressRouter(myRoutes, { 
    debugLog: process.env.NODE_ENV !== 'production' 
  });
  
  // 6. Mount the API
  app.use('/api', router);
  
  app.listen(3000, () => {
    console.log('🚀 API running at http://localhost:3000/api');
  });
};

startServer().catch(console.error);
```

**That's it!** Your database is now a full REST API! 🎉

## 📋 Complete API Reference

### 🔗 Auto-Generated Endpoints

ADBA automatically creates these endpoints for **every table** in your database:

#### **CRUD Operations**
```bash
# List all records (with pagination, search, filtering)
GET    /api/table/                    # List with query parameters
POST   /api/table/                    # List with request body (advanced filtering)

# Create records
PUT    /api/table/                    # Create single or multiple records

# Update records  
PATCH  /api/table/                    # Bulk update with conditions
PATCH  /api/table/:id                 # Update specific record by ID

# Delete records
DELETE /api/table/                    # Bulk delete with conditions  
DELETE /api/table/:id                 # Delete specific record by ID
```

#### **Read Operations**
```bash
# Get by ID (numeric)
GET    /api/table/:id                 # Get record by primary key

# Get by Name (string) ⭐ NEW
GET    /api/table/:name               # Get record by name field
                                      # Searches 'name' column or first string column

# Metadata
GET    /api/table/meta                # Get table schema and column info
GET    /api/                          # List all available endpoints
```

### 🔍 Advanced Query Parameters

#### **Pagination**
```bash
GET /api/users/?limit=10&page=0       # Get 10 users, first page
GET /api/users/?limit=20&page=2       # Get 20 users, third page
```

#### **Search**
```bash
GET /api/users/?q=john                # Search for "john" in all string columns
GET /api/products/?q=laptop           # Search for "laptop" in all text fields
```

### **Filtering**

Both dot-notation and bracket-notation querystring formats are supported. The router normalizes bracket-style keys (e.g. `filters[age][$gte]=18`) into dot notation before processing, so either form works.

```bash
# Simple equality (dot notation)
GET /api/users/?filters.active=true
GET /api/products/?filters.category=electronics

# Simple equality (bracket notation)
GET /api/users/?filters[active]=true
GET /api/products/?filters[category]=electronics

# Comparison operators (either form)
GET /api/users/?filters.age.$gte=18        # age >= 18
GET /api/users/?filters[age][$gte]=18      # equivalent bracket form
GET /api/products/?filters.price.$lt=100
GET /api/products/?filters[price][$lt]=100
GET /api/orders/?filters.date.$gt=2023-01-01

# Multiple filters
GET /api/users/?filters.active=true&filters.role=admin
GET /api/users/?filters[active]=true&filters[role]=admin
```

#### **Ordering**
```bash
# Single column
GET /api/users/?orderBy=name                 # Order by name (ascending)
GET /api/products/?orderBy=price:desc        # Order by price (descending)

# Multiple columns
GET /api/users/?orderBy=role:asc,name:desc   # Order by role then name
```

#### **Complex Queries (POST)**
```bash
POST /api/users/
Content-Type: application/json

{
  "filters": {
    "active": true,
    "age": { "$gte": 21, "$lt": 65 },
    "role": ["admin", "moderator"]
  },
  "orderBy": { "created_at": "desc" },
  "limit": 50,
  "page": 0,
  "q": "john"
}
```

## 🛠️ Complete Module Reference

### 📦 **Core Modules**

#### **Model Generation**
```typescript
import { 
  generateModels,           // Main model generator (auto-detects DB type)
  generateSQLiteModels,     // SQLite-specific model generation
  generateMySQLModels,      // MySQL-specific model generation  
  generatePostgreSQLModels, // PostgreSQL-specific model generation
  generateMSSQLModels       // MSSQL-specific model generation
} from 'adba';

// Auto-detect database type and generate models
const models = await generateModels(knexInstance, {
  // Optional: Custom schema modifications
  squemaFixings: (tableName, schema) => ({ ...schema, customField: { type: 'string' } }),
  
  // Optional: Custom relationships
  relationsFunc: (tableName, relations) => ({
    ...relations,
    profile: {
      relation: Model.HasOneRelation,
      modelClass: models.ProfileModel,
      join: { from: 'users.id', to: 'profiles.user_id' }
    }
  }),
  
  // Optional: Custom column metadata
  columnsFunc: (tableName, columns) => ({
    ...columns,
    created_at: { ...columns.created_at, label: 'Created Date' }
  })
});
```

#### **Router & Routes**
```typescript
import { 
  expressRouter,       // Create Express router from routes object
  routesObject,        // Generate routes configuration from models
  modifyDefinedRoutes, // Modify default route definitions
  addTableAlias,       // Add table name aliases
  listRoutes          // Get list of all routes
} from 'adba';

// Basic routes generation
const routes = routesObject(models);

// Advanced routes with customization
const customRoutes = routesObject(models, controllers, {
  // Custom endpoints
  customEndpoints: {
    auth: {
      'POST /login': 'AuthController.login',
      'POST /register': 'AuthController.register',
      'GET /profile': 'AuthController.profile'
    }
  },
  
  // Table aliases
  tableAlias: {
    'user_profiles': 'profiles',
    'product_categories': 'categories'
  },
  
  // Method restrictions
  methodsBlacklist: {
    'sensitive_table': ['DELETE']  // Disable DELETE for sensitive tables
  }
});

// Create router with options
const router = expressRouter(customRoutes, {
  debugLog: true,           // Enable debug logging
  enableCors: true,         // Enable CORS middleware
  customMiddleware: [       // Add custom middleware
    (req, res, next) => {
      console.log('Custom middleware');
      next();
    }
  ]
});
```

#### **Controller (Database Operations)**
```typescript
import { Controller } from 'adba';

// Create controller for a model
const userController = new Controller(UserModel, {
  searchIn: ['name', 'email', 'username']  // Default search columns
});

// Available methods
await userController.list(query);           // List with pagination/filtering
await userController.selectById(id);        // Get by ID
await userController.selectByName(name);    // Get by name field
await userController.selectOne(filters);    // Get single record
await userController.selectOneActive(id);   // Get active record by ID
await userController.insert(data);          // Create record(s)
await userController.update(data, filters); // Update records
await userController.delete(filters);       // Delete records  
await userController.deleteWhere(filters);  // Delete with complex conditions
await userController.meta();                // Get table metadata
```

### 🔧 **Utility Modules**

#### **Data Formatting**
```typescript
import { formatData, addRuleActions } from 'adba';

// Add custom formatting rules
addRuleActions({
  ':upper': (value) => String(value).toUpperCase(),
  ':currency': (value) => `$${Number(value).toFixed(2)}`,
  ':slug': (value) => String(value).toLowerCase().replace(/\s+/g, '-')
});

// Apply formatting rules
const formatted = formatData(
  { name: 'john doe', price: 99.5, active: 1 },
  { 
    name: ['string', ':upper'],      // Convert to uppercase string
    price: ['number', ':currency'],  // Format as currency
    active: 'boolean'                // Convert to boolean
  }
);
// Result: { name: 'JOHN DOE', price: '$99.50', active: true }
```

#### **Encryption & Security**
```typescript
import { 
  encrypt, decrypt,           // AES-256-CBC encryption
  generatePasswordHash,       // bcrypt password hashing
  verifyPasswordHash,         // Password verification
  generateCode,              // Generate random codes
  getClientType              // User agent detection
} from 'adba/crypt';

// Encrypt sensitive data
const { encryptedData, iv } = encrypt('sensitive data', 'password', '');
const decrypted = decrypt(encryptedData, 'password', iv);

// Password hashing
const hash = await generatePasswordHash('user-password');
const isValid = await verifyPasswordHash('user-password', hash);

// Generate verification codes
const code = generateCode();  // Returns random 6-digit code

// Detect client type
const clientInfo = getClientType(req.headers['user-agent']);
```

#### **JWT Token Management**
```typescript
import jwt from 'jsonwebtoken';

// ADBA includes JWT utilities through the crypt module
const token = jwt.sign({ userId: 123 }, 'secret', { expiresIn: '24h' });
const decoded = jwt.verify(token, 'secret');
```

#### **Email System**
```typescript
import { 
  setEmailProcessModel,    // Set email queue model
  setSystemModel,         // Set system configuration model
  colorPrimary,          // Set email theme color
  setConfig              // Set email configuration
} from 'adba/email';

// Configure email system
setEmailProcessModel(EmailQueueModel);
setSystemModel(SystemConfigModel);
colorPrimary('#007bff');

setConfig({
  attemptsTotal: 3,           // Max retry attempts
  maxScheduling: 100,         // Max emails per batch
  priorOrder: 1,             // Priority order value
  runningPriorSchedule: true // Enable priority scheduling
});

// Email templates support MJML and Handlebars
const emailTemplate = {
  subject: 'Welcome {{name}}!',
  template: `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Hello {{name}}, welcome to our platform!</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `
};
```

#### **Database Management**
```typescript
import { dumpDatabase } from 'adba/dump-database';
import { 
  knexSqliteInstance,
  knexMySqlInstance,
  knexPostgreSQLInstance,
  knexMSSQLInstance
} from 'adba/knex-instances';

// Database dumping
const dumpResult = await dumpDatabase(knexInstance, './backups');
// Returns: { schemaFile: './backups/schema.sql', fullFile: './backups/schema_data.sql' }

// Create database connections with SSH tunneling
const knexWithTunnel = await knexMySqlInstance({
  host: 'remote-db.example.com',
  user: 'db_user',
  password: 'db_password',
  database: 'my_database',
  tunnel: {
    username: 'ssh_user',
    host: 'ssh-server.example.com',
    port: 22,
    privateKey: '/path/to/private/key'
  }
});
```

#### **Status Codes & Responses**
```typescript
import { getStatusCode, addStatusCodes } from 'adba';

// Add custom status codes
addStatusCodes([
  { code: 1001, status: 422, description: 'Invalid email format' },
  { code: 1002, status: 409, description: 'Email already exists' }
]);

// Get standardized status response
const response = getStatusCode(200, 0, { user: userData });
// Returns: { success: true, error: false, status: 200, code: 0, description: 'ok', data: {...} }

const errorResponse = getStatusCode(400, 1001);
// Returns: { success: false, error: true, status: 422, code: 1001, description: 'Invalid email format' }
```

#### **Model Utilities**
```typescript
import { 
  getModelByTableName,    // Find model by table name
  className,             // Convert string to class name format
  jsonSchemaToColumns    // Convert JSON schema to column metadata
} from 'adba/model-utilities';

// Find model by table name
const UserModel = getModelByTableName('users', models);

// Convert to class name
const modelName = className('user_profiles');  // Returns: 'UserProfiles'

// Convert schema to columns
const columns = jsonSchemaToColumns(
  UserModel.jsonSchema,
  (tableName, originalColumns) => ({
    ...originalColumns,
    created_at: { ...originalColumns.created_at, label: 'Created Date' }
  }),
  'users'
);
```

## 🎯 Advanced Usage Examples

### Example 1: E-commerce API
```typescript
import express from 'express';
import Knex from 'knex';
import { generateModels, routesObject, expressRouter } from 'adba';

const knex = Knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'ecommerce_user',
    password: 'password',
    database: 'ecommerce_db'
  }
});

const app = express();
app.use(express.json());

const startEcommerceAPI = async () => {
  // Generate models for all tables
  const models = await generateModels(knex, {
    relationsFunc: (tableName, relations) => {
      // Add custom relationships
      if (tableName === 'products') {
        relations.category = {
          relation: models.CategoryModel.BelongsToOneRelation,
          modelClass: models.CategoryModel,
          join: { from: 'products.category_id', to: 'categories.id' }
        };
      }
      return relations;
    }
  });

  // Create routes with custom endpoints
  const routes = routesObject(models, {}, {
    customEndpoints: {
      products: {
        'GET /featured': 'ProductController.getFeatured',
        'GET /search': 'ProductController.search',
        'GET /category/:category': 'ProductController.getByCategory'
      },
      orders: {
        'POST /calculate-shipping': 'OrderController.calculateShipping',
        'POST /:id/send-confirmation': 'OrderController.sendConfirmation'
      }
    },
    tableAlias: {
      'product_categories': 'categories',
      'order_items': 'items'
    }
  });

  const router = expressRouter(routes, {
    debugLog: process.env.NODE_ENV === 'development',
    enableCors: true
  });

  app.use('/api/v1', router);
  
  app.listen(3000, () => {
    console.log('🛒 E-commerce API running at http://localhost:3000/api/v1');
  });
};

startEcommerceAPI();
```

### Example 2: Multi-Database Blog API
```typescript
import { generateModels, routesObject, expressRouter } from 'adba';
import { knexMySqlInstance, knexSqliteInstance } from 'adba/knex-instances';

const startBlogAPI = async () => {
  // Main database (MySQL)
  const mainDb = await knexMySqlInstance({
    host: 'localhost',
    user: 'blog_user',
    password: 'password',
    database: 'blog_main'
  });

  // Analytics database (SQLite)
  const analyticsDb = await knexSqliteInstance({
    filename: './analytics.db'
  });

  // Generate models for both databases
  const [mainModels, analyticsModels] = await Promise.all([
    generateModels(mainDb),
    generateModels(analyticsDb)
  ]);

  // Combine models
  const allModels = { ...mainModels, ...analyticsModels };

  // Create unified routes
  const routes = routesObject(allModels, {}, {
    customEndpoints: {
      posts: {
        'GET /published': 'PostController.getPublished',
        'POST /:id/like': 'PostController.addLike',
        'GET /:slug': 'PostController.getBySlug'
      },
      analytics: {
        'GET /dashboard': 'AnalyticsController.getDashboard',
        'GET /reports/:type': 'AnalyticsController.getReport'
      }
    }
  });

  const router = expressRouter(routes);
  
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  
  app.listen(3000);
};
```

### Example 3: Secure API with Authentication
```typescript
import jwt from 'jsonwebtoken';
import { generatePasswordHash, verifyPasswordHash } from 'adba/crypt';
import { generateModels, routesObject, expressRouter, Controller } from 'adba';

// Custom authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const startSecureAPI = async () => {
  const models = await generateModels(knex);
  
  // Custom auth controller
  class AuthController extends Controller {
    constructor() {
      super(models.UserModel);
    }

    async login(req, res) {
      const { email, password } = req.body;
      
      const user = await models.UserModel.query()
        .where('email', email)
        .first();

      if (!user || !await verifyPasswordHash(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { id: user.id, email: user.email } });
    }

    async register(req, res) {
      const { email, password, name } = req.body;
      
      const hashedPassword = await generatePasswordHash(password);
      
      const user = await models.UserModel.query().insert({
        email,
        password: hashedPassword,
        name
      });

      res.status(201).json({ message: 'User created', userId: user.id });
    }
  }

  const authController = new AuthController();

  const routes = routesObject(models, { AuthController: authController }, {
    customEndpoints: {
      auth: {
        'POST /login': 'AuthController.login',
        'POST /register': 'AuthController.register'
      }
    }
  });

  const router = expressRouter(routes, {
    customMiddleware: [authMiddleware], // Apply to all routes except auth
    excludeMiddleware: ['/auth/login', '/auth/register'] // Don't apply auth to these routes
  });

  const app = express();
  app.use(express.json());
  app.use('/api', router);
  
  app.listen(3000);
};
```

## 📚 Package Information

### Installation
```bash
npm install adba
# or
yarn add adba
```

### Module Exports
ADBA supports both **CommonJS** and **ES Modules**:

```javascript
// ES Modules (recommended)
import { generateModels, expressRouter, routesObject } from 'adba';
import { encrypt, decrypt } from 'adba/crypt';
import { formatData } from 'adba/format-data';

// CommonJS
const { generateModels, expressRouter, routesObject } = require('adba');
const { encrypt, decrypt } = require('adba/crypt');
```

### Available Submodules
- **`adba`** - Core functionality (models, router, routes)
- **`adba/controller`** - Database controller class
- **`adba/crypt`** - Encryption and security utilities
- **`adba/email`** - Email system with templates
- **`adba/format-data`** - Data transformation utilities
- **`adba/dump-database`** - Database backup utilities  
- **`adba/knex-instances`** - Database connection helpers
- **`adba/model-utilities`** - Model helper functions
- **`adba/status-codes`** - HTTP status code management
- **`adba/types`** - TypeScript type definitions

### CLI Usage
ADBA also provides a command-line interface:

```bash
# Install globally
npm install -g adba

# Use CLI (coming soon)
adba generate --database sqlite --file ./database.db
adba serve --database mysql --host localhost --port 3306
```

## 🧪 Testing & Development

### Running Tests
```bash
# Install dependencies
yarn install

# Run all tests
yarn test

# Run tests with coverage
yarn test --coverage

# Run specific test
yarn test controller.test.ts
```

### Building from Source
```bash
# Build all formats (CommonJS + ES Modules + Types)
yarn build

# Build specific format
yarn build:cjs    # CommonJS
yarn build:esm    # ES Modules

# Generate documentation
yarn doc
```

### Development Features
- **TypeScript**: Full type safety and IntelliSense support
- **Jest Testing**: Comprehensive test suite with >85% coverage  
- **Hot Reload**: Development server with automatic restart
- **Debug Logging**: Detailed logs for development debugging
- **Source Maps**: Full source map support for debugging

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

### Generate Custom Postman Collections:
```bash
# Generate collection for specific table
yarn postman:users       # Creates collection for 'users' table
yarn postman:products    # Creates collection for 'products' table

# Generate generic collection
yarn postman:generate
```

📖 **Full Postman guide**: See [POSTMAN.md](./POSTMAN.md) for detailed instructions.

## 🛠️ Configuration Options

### Database Connection Configuration

```typescript
// SQLite
const sqliteConfig = {
  client: 'sqlite3',
  connection: { filename: './database.db' },
  useNullAsDefault: true
};

// MySQL
const mysqlConfig = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'username',
    password: 'password',
    database: 'database_name'
  }
};

// PostgreSQL  
const postgresConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'username',
    password: 'password',
    database: 'database_name'
  }
};

// MSSQL
const mssqlConfig = {
  client: 'mssql',
  connection: {
    server: 'localhost',
    port: 1433,
    user: 'username',
    password: 'password',
    database: 'database_name',
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  }
};
```

### Router Configuration

```typescript
const router = expressRouter(routes, {
  // Debug options
  debugLog: process.env.NODE_ENV === 'development',  // Enable debug logging
  
  // CORS configuration
  enableCors: true,                                   // Enable CORS middleware
  corsOptions: {                                      // Custom CORS options
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // Custom middleware
  customMiddleware: [                                 // Add custom middleware
    express.json({ limit: '10mb' }),
    morgan('combined'),
    authMiddleware
  ],
  
  // Middleware exclusions
  excludeMiddleware: ['/auth/login', '/auth/register'], // Skip middleware for these routes
  
  // Response formatting
  formatResponse: true,                               // Use standard response format
  
  // Error handling
  customErrorHandler: (err, req, res, next) => {     // Custom error handler
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Routes Configuration

```typescript
const routes = routesObject(models, controllers, {
  // Custom endpoints
  customEndpoints: {
    users: {
      'GET /profile': 'UserController.getProfile',
      'POST /change-password': 'UserController.changePassword'
    }
  },
  
  // Table aliases  
  tableAlias: {
    'user_profiles': 'profiles',
    'product_categories': 'categories'
  },
  
  // Method restrictions
  methodsBlacklist: {
    'admin_users': ['DELETE'],                        // Disable DELETE for admin_users
    'system_logs': ['POST', 'PUT', 'PATCH', 'DELETE'] // Read-only table
  },
  
  // Method whitelist (only allow specified methods)
  methodsWhitelist: {
    'readonly_table': ['GET']                         // Only allow GET requests
  },
  
  // Custom route modifications
  routeModifications: {
    'users': {
      'POST /': 'UserController.createUser',          // Override default POST handler
      'GET /:id': 'UserController.getUserWithProfile' // Override default GET by ID
    }
  }
});
```

## 🔧 Environment Variables

Create a `.env` file in your project root:

```bash
# Database Configuration
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=username
DB_PASSWORD=password
DB_NAME=database_name

# Server Configuration  
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_PASSWORD=your-encryption-password

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password

# Debug Options
DEBUG_LOG=true
ENABLE_CORS=true
```

Then use in your application:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const knex = Knex({
  client: process.env.DB_CLIENT,
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});
```

## 🚀 Production Deployment

### Build for Production

```bash
# Install dependencies
npm install --production

# Build the project
npm run build

# Start production server
NODE_ENV=production npm start
```

### Performance Optimization

```typescript
// Production optimizations
const router = expressRouter(routes, {
  debugLog: false,                    // Disable debug logging
  enableCors: process.env.NODE_ENV !== 'production', // Disable CORS in production
  
  // Connection pooling
  pooling: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  },
  
  // Caching
  enableCache: true,
  cacheOptions: {
    ttl: 300,                         // 5 minutes cache
    max: 1000                         // Max 1000 cached items
  }
});

// Enable compression
app.use(compression());

// Security headers
app.use(helmet());

// Rate limiting
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,           // 15 minutes
  max: 100                            // Limit each IP to 100 requests per windowMs
}));
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=database
    depends_on:
      - database
      
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## 📊 Monitoring & Analytics

### Health Check Endpoint

```typescript
// Add health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add to router
const router = expressRouter(routes, {
  customLogger: logger,
  logRequests: true,
  logResponses: process.env.NODE_ENV === 'development'
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/joneldiablo/adba.git
cd adba

# Install dependencies
yarn install

# Run tests
yarn test

# Build project
yarn build

# Generate documentation
yarn doc
```

### Release Process

```bash
# Verify prerequisites
./verify-release.sh

# Release with OTP
./release.sh --otp YOUR_OTP
```

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- 📖 **Documentation**: [https://joneldiablo.github.io/adba/](https://joneldiablo.github.io/adba/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/joneldiablo/adba/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/joneldiablo/adba/discussions)
- 📦 **npm Package**: [https://www.npmjs.com/package/adba](https://www.npmjs.com/package/adba)

## 🎯 What's Next?

### Database Support Roadmap
- [x] **SQLite** - Complete ✅
- [x] **MySQL** - Complete ✅
- [ ] **PostgreSQL** - Testing in progress 🔄
- [ ] **MSSQL** - Testing in progress 🔄

---

**Made with ❤️ by [joneldiablo](https://github.com/joneldiablo)**

*Transform any database into a powerful REST API in minutes, not hours!* 🚀
