# Development Guidelines for AI Agents

> Este documento establece los lineamientos de desarrollo que deben seguirse en **todos los proyectos**. Es un documento genérico y reutilizable que debe copiarse en cada proyecto nuevo para mantener consistencia en los estándares de desarrollo.

---

## 1. Testing Requirements

### Unit Testing Standards

- **Test Coverage**: Maintain a minimum of **85% code coverage** across the project
- **Mock Strategy**: All external dependencies must be mocked in unit tests to ensure isolated testing
- **Test Location**: Each source file in `src/` must have a corresponding test file in `__tests__/` at the project root
- **Folder Structure**: The `__tests__/` directory **must mirror exactly** the folder structure of `src/`
- **Test Execution**: Run tests using `yarn test` (package.json must include `jest --coverage` in the test script)

### Testing Best Practices

```typescript
/**
 * Example test structure with proper mocking
 * 
 * @example
 * ```typescript
 * import { ServiceClass } from '../src/services/service-class';
 * 
 * jest.mock('../src/external/dependency', () => ({
 *   ExternalService: jest.fn().mockImplementation(() => ({
 *     connect: jest.fn().mockResolvedValue(true),
 *     disconnect: jest.fn().mockResolvedValue(true)
 *   }))
 * }));
 * 
 * describe('ServiceClass', () => {
 *   it('should perform operation successfully', async () => {
 *     const service = new ServiceClass(mockConfig);
 *     await expect(service.performOperation()).resolves.toBe(expectedResult);
 *   });
 * });
 * ```
 */
```

### Update Process

When updating any source file:
1. Review affected test files
2. Update mocks to reflect new dependencies or changes
3. Add tests for new functionality
4. Ensure coverage remains above 85%
5. Run `yarn test` before committing

**Important**: When creating new folders in `src/`, immediately create the corresponding folder structure in `__tests__/`. This keeps the project organized and ensures no test files are missed.

#### Example: Adding a new module

```bash
# 1. Create new source folder and file
mkdir -p src/services
touch src/services/new-service.ts

# 2. Immediately create corresponding test structure
mkdir -p __tests__/services
touch __tests__/services/new-service.test.ts

# 3. Implement source code
vim src/services/new-service.ts

# 4. Implement tests with proper mocks
vim __tests__/services/new-service.test.ts
```

---

## 2. File Structure and Organization

### File Mapping

The `__tests__/` directory structure **must replicate exactly** the `src/` directory structure:

```
src/
├── index.ts               → __tests__/index.test.ts
├── server.ts              → __tests__/server.test.ts
├── cli.ts                 → __tests__/cli.test.ts
├── responses.ts           → __tests__/responses.test.ts
├── services/
│   ├── index.ts           → __tests__/services/index.test.ts
│   ├── user-service.ts    → __tests__/services/user-service.test.ts
│   └── data-service.ts    → __tests__/services/data-service.test.ts
└── utils/
    ├── index.ts           → __tests__/utils/index.test.ts
    ├── validators.ts      → __tests__/utils/validators.test.ts
    └── helpers.ts         → __tests__/utils/helpers.test.ts
```

**Rule**: For every file `src/path/to/file.ts`, there must exist `__tests__/path/to/file.test.ts`

### Line Limit per File

- **Maximum lines per file**: 500-700 lines
- **Rationale**: Maintains readability and follows SOLID principles
- **Action**: If a file exceeds 700 lines, refactor into smaller, focused modules
- **Refactoring**: The refactoring process may include creating new files and folders. When doing so, **always create the corresponding test structure** in `__tests__/` to maintain the mirror structure.

### Modular Design Example

❌ **Bad**: Single 1500-line file
```typescript
// services.ts (1500 lines)
class UserService { /* 300 lines */ }
class ProductService { /* 400 lines */ }
class OrderService { /* 500 lines */ }
class NotificationService { /* 300 lines */ }
```

✅ **Good**: Separated into focused files
```
src/services/
├── index.ts              (auto-generated exports)
├── user-service.ts       (350 lines)
├── product-service.ts    (450 lines)
├── order-service.ts      (550 lines)
└── notification-service.ts (350 lines)
```

---

## 3. Documentation Standards

### TypeDoc Comments

All functions, classes, interfaces, and types must include comprehensive TypeDoc comments with:
- Description of purpose
- Parameter documentation
- Return value documentation
- **Usage examples** (mandatory)

### Documentation Example

```typescript
/**
 * Establishes a connection to an external service using provided configuration.
 * Handles connection pooling and automatic reconnection on failure.
 * 
 * @param config - Service configuration object
 * @param config.host - Service host address
 * @param config.port - Service port number
 * @param config.apiKey - Authentication API key
 * @param options - Optional connection settings
 * @param options.timeout - Connection timeout in milliseconds (default: 5000)
 * @param options.retries - Maximum retry attempts (default: 3)
 * 
 * @returns Promise that resolves to service connection instance
 * 
 * @throws {ServiceConnectionError} If connection fails after retries
 * 
 * @example
 * ```typescript
 * // Basic connection
 * const service = await connectToService({
 *   host: 'api.example.com',
 *   port: 443,
 *   apiKey: 'your-api-key'
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Connection with custom options
 * const service = await connectToService(
 *   { host: 'api.example.com', port: 443, apiKey: 'key' },
 *   { timeout: 10000, retries: 5 }
 * );
 * ```
 */
export async function connectToService(
  config: ServiceConfig,
  options?: ConnectionOptions
): Promise<ServiceConnection> {
  // Implementation
}
```

### README.md Maintenance

The README.md must include:
- Project description and purpose
- Installation instructions
- Configuration guide
- **Code examples** from TypeDoc comments
- How to run the application
- **How to generate and view documentation**
- Testing instructions
- Deployment guidelines

#### Documentation Generation

Include in README.md:
```markdown
## Documentation

Generate TypeDoc documentation:

\`\`\`bash
yarn docs
\`\`\`

View documentation:
- Open `docs/index.html` in your browser
- Or serve locally: `npx http-server docs -o`

Documentation includes:
- Full API reference
- Usage examples for all functions
- Type definitions
- Architecture diagrams
```

---

## 4. Build and Release Process

> **Note**: The release process is included here for reference and understanding only. **The user will execute the release process manually**. Agents should focus on ensuring code quality, tests, and documentation are ready for release, but should not execute release scripts.

### Automated Exports

**Index files and package.json exports are automatically generated** - do not manually edit them.

#### Auto-generated Files

- `src/index.ts` (main entry point)
- `src/services/index.ts` (service exports)
- Any other `index.ts` files in subdirectories
- `package.json` "exports" field

#### Build Scripts

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "generate:exports": "node generate-exports.js",
    "test": "jest --coverage",
    "docs": "typedoc",
    "release": "./release.sh"
  }
}
```

### Release Workflow

1. **Pre-release checks**:
   ```bash
   yarn test              # Ensure tests pass with >85% coverage
   yarn lint              # Code quality check (if configured)
   yarn build             # Verify build succeeds
   ```

2. **Generate exports** (usually automatic in build process):
   ```bash
   node generate-exports.js
   ```

3. **Update version**:
   ```bash
   node update-version.js
   ```

4. **Execute release**:
   ```bash
   ./release.sh
   ```

### Verification Checklist

Before each release:
- [ ] All tests pass with ≥85% coverage
- [ ] Documentation is up-to-date
- [ ] README.md includes latest examples
- [ ] Build completes without errors
- [ ] Auto-generated exports are current
- [ ] Version number is updated

---

## 5. SOLID Principles Compliance

### Single Responsibility Principle (SRP)
- Each class/function has one clear purpose
- If describing a file requires "and", it needs splitting

### Open/Closed Principle (OCP)
- Use interfaces and abstract classes for extensibility
- New features should extend, not modify existing code

### Liskov Substitution Principle (LSP)
- Derived classes must be substitutable for their base classes
- Maintain consistent behavior in inheritance hierarchies

### Interface Segregation Principle (ISP)
- Create small, focused interfaces
- Clients shouldn't depend on unused methods

### Dependency Inversion Principle (DIP)
- Depend on abstractions, not implementations
- Use dependency injection

### Example of SOLID Compliance

```typescript
/**
 * Service adapter interface following ISP
 * 
 * @example
 * ```typescript
 * class ApiAdapter implements IServiceAdapter {
 *   async connect(config: ServiceConfig): Promise<void> {
 *     // API-specific implementation
 *   }
 * }
 * ```
 */
export interface IServiceAdapter {
  connect(config: ServiceConfig): Promise<void>;
  disconnect(): Promise<void>;
  request(endpoint: string, params?: any): Promise<ServiceResponse>;
}

/**
 * Service manager following DIP - depends on abstraction
 */
export class ServiceManager {
  constructor(private adapter: IServiceAdapter) {}
  
  async makeRequest(endpoint: string): Promise<ServiceResponse> {
    return this.adapter.request(endpoint);
  }
}
```

---

## 6. Environment Variables and Configuration

### CLI.ts Responsibility

The `cli.ts` file is the **central point for all environment variable handling** and environment control.

#### Rules

1. **Only `cli.ts` reads environment variables** (except `process.env.ENV` and `process.env.NODE_ENV`)
2. **All other files receive configuration through parameters**
3. **No direct `process.env` usage** outside of cli.ts (except ENV and NODE_ENV)
4. **Must use yargs for CLI configuration** with:
   - Commands (`.command()`) for different operations
   - Options (`.option()`) for each command with proper descriptions
   - Environment variable references in `defaultDescription`
   - Examples (`.example()`) showing CLI params and env vars
   - Comprehensive help documentation automatically generated by yargs

### Allowed Direct Usage

These two variables can be used anywhere:
- `process.env.ENV` - Environment name (dev, staging, production)
- `process.env.NODE_ENV` - Node environment (development, production, test)

```typescript
// Allowed in any file
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

if (process.env.ENV === 'production') {
  // Production-specific logic
}
```

### Configuration Pattern

#### ❌ Bad: Direct environment access in modules

```typescript
// server.ts (BAD)
export function startServer() {
  const port = process.env.PORT || 3000;  // ❌ Don't do this
  const host = process.env.HOST || 'localhost';  // ❌ Don't do this
  // ...
}
```

#### ✅ Good: Configuration through parameters

```typescript
// cli.ts (GOOD) - Central configuration
import { startServer } from './server';

/**
 * Main entry point - handles all environment configuration
 */
async function main() {
  const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    apiKey: process.env.API_KEY,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    }
  };
  
  await startServer(config);
}

// server.ts (GOOD) - Receives configuration
/**
 * Starts the HTTP server with provided configuration
 * 
 * @param config - Server configuration
 * @example
 * ```typescript
 * await startServer({
 *   port: 3000,
 *   host: 'localhost',
 *   apiKey: 'your-key',
 *   database: { ... }
 * });
 * ```
 */
export async function startServer(config: ServerConfig): Promise<void> {
  // Use config parameter, not process.env
  const server = express();
  server.listen(config.port, config.host, () => {
    console.log(`Server running on ${config.host}:${config.port}`);
  });
}
```

### Environment Configuration Example

```typescript
#!/usr/bin/env node

// cli.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Application configuration interface
 */
export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  service: {
    apiKey: string;
    endpoint: string;
  };
}

/**
 * Configures and parses CLI arguments using yargs with commands
 * Note: cli.ts is the ONLY file that should have the shebang (#!/usr/bin/env node)
 * 
 * @returns Parsed yargs instance
 * 
 * @example
 * ```typescript
 * const cli = configureCLI();
 * // Automatically handles --help and command routing
 * ```
 */
function configureCLI() {
  return yargs(hideBin(process.argv))
    .scriptName('project-name')
    .version('1.0.0')
    .usage('$0 <command> [options]')
    
    // Start server command
    .command(
      'start',
      'Start the application server',
      (yargs) => {
        return yargs
          .option('port', {
            alias: 'p',
            type: 'number',
            description: 'Server port',
            default: 3000,
            defaultDescription: 'PORT environment variable or 3000'
          })
          .option('api-key', {
            type: 'string',
            description: 'API key for external services (required)',
            defaultDescription: 'API_KEY environment variable (required)'
          })
          .example('$0 start --port 3000 --api-key your-key', 'Start with CLI params')
          .example('PORT=3000 API_KEY=your-key $0 start', 'Start with env vars');
      },
      async (argv) => {
        const config = loadConfiguration(argv);
        await startServer(config);
      }
    )
    
    .demandCommand(1, 'You must specify a command')
    .epilogue('Environment variables take precedence over CLI arguments.')
    .help()
    .strict();
}

/**
 * Loads and validates configuration from environment variables and CLI args
 * Environment variables take precedence over CLI arguments
 * 
 * @param argv - Parsed yargs arguments
 * @returns Application configuration object
 * @throws {Error} If required variables are missing
 */
export function loadConfiguration(argv: any): AppConfig {
  const apiKey = process.env.API_KEY || argv.apiKey;
  const endpoint = process.env.SERVICE_ENDPOINT || argv.endpoint;

  // Validate required variables
  if (!apiKey) {
    throw new Error('Missing required API_KEY. Set via environment variable or --api-key argument.');
  }
  
  return {
    server: {
      port: parseInt(process.env.PORT || String(argv.port || 3000), 10),
      host: process.env.HOST || argv.host || '0.0.0.0'
    },
    service: {
      apiKey,
      endpoint: endpoint || 'https://api.default.com'
    }
  };
}

/**
 * Main CLI entry point
 */
async function main() {
  try {
    await configureCLI().parseAsync();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
```

### Environment Documentation (.env.example)

**Every project must maintain an up-to-date `.env.example` file** that documents all environment variables used by the application.

#### Requirements

1. **Complete documentation**: Every environment variable read in `cli.ts` must be documented
2. **Example values**: Provide realistic example values (never real secrets)
3. **Clear descriptions**: Each variable should have a comment explaining its purpose
4. **Categorization**: Group related variables together
5. **Required vs Optional**: Clearly mark which variables are required

#### .env.example Template

```bash
# =============================================================================
# PROJECT NAME - Environment Variables
# =============================================================================
# Copy this file to .env and update the values for your environment
# Never commit real secrets or production values to version control

# -----------------------------------------------------------------------------
# Server Configuration
# -----------------------------------------------------------------------------
# Server port (default: 3000)
PORT=3000

# Server host (default: 0.0.0.0)
HOST=0.0.0.0

# CORS origin for frontend (optional)
CORS_ORIGIN=http://localhost:3000

# -----------------------------------------------------------------------------
# Authentication & Security
# -----------------------------------------------------------------------------
# JWT secret for token signing (REQUIRED)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-signing-key-here

# API key for external services (REQUIRED)
API_KEY=your-external-api-key-here

# -----------------------------------------------------------------------------
# Database Configuration (Optional)
# -----------------------------------------------------------------------------
# Database host (default: localhost)
DB_HOST=localhost

# Database port (default: 5432 for PostgreSQL, 3306 for MySQL)
DB_PORT=5432

# Database name (REQUIRED if using database)
DB_NAME=your_database_name

# Database user (REQUIRED if using database)
DB_USER=your_db_user

# Database password (REQUIRED if using database)
DB_PASSWORD=your_db_password

# -----------------------------------------------------------------------------
# External Services
# -----------------------------------------------------------------------------
# Service endpoint URL (optional)
SERVICE_ENDPOINT=https://api.example.com

# Service timeout in milliseconds (default: 5000)
SERVICE_TIMEOUT=5000

# -----------------------------------------------------------------------------
# Environment & Logging
# -----------------------------------------------------------------------------
# Environment name: development, staging, production
ENV=development

# Node environment: development, production, test
NODE_ENV=development

# Log level: error, warn, info, debug (default: info)
LOG_LEVEL=info

# -----------------------------------------------------------------------------
# Feature Flags (Optional)
# -----------------------------------------------------------------------------
# Enable specific features (true/false)
ENABLE_FEATURE_X=false
ENABLE_METRICS=true
```

#### Maintenance Rules

1. **Update immediately**: When adding new environment variables to `cli.ts`, update `.env.example` in the same commit
2. **Security first**: Never include real secrets, API keys, or production values
3. **Validation**: Ensure all variables in `.env.example` are actually used in the code
4. **Documentation sync**: Keep comments in sync with actual usage in `cli.ts`
5. **CI/CD check**: Consider adding a check to ensure `.env.example` includes all variables from `cli.ts`

#### Example Integration in CLI

```typescript
// cli.ts - Reference .env.example in help text
function configureCLI() {
  return yargs(hideBin(process.argv))
    .scriptName('project-name')
    .version('1.0.0')
    .usage('$0 <command> [options]')
    .epilogue([
      'Environment variables take precedence over CLI arguments.',
      'See .env.example for a complete list of supported variables.',
      'Copy .env.example to .env and customize for your environment.'
    ].join('\n'))
    // ... rest of CLI configuration
}
```

#### Project Setup Reminder

Include in README.md:
```markdown
## Quick Start

1. Copy environment template:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit `.env` with your values:
   \`\`\`bash
   vim .env  # Update JWT_SECRET, API_KEY, etc.
   \`\`\`

3. Install and run:
   \`\`\`bash
   yarn install
   yarn start
   \`\`\`
```

---

## 7. Code Quality Checklist

Before committing any code, verify:

- [ ] **Testing**: All tests pass with ≥85% coverage
- [ ] **Documentation**: TypeDoc comments with examples added
- [ ] **File Size**: No file exceeds 700 lines
- [ ] **SOLID**: Code follows SOLID principles
- [ ] **Environment**: No direct `process.env` usage (except ENV/NODE_ENV)
- [ ] **Configuration**: Parameters used instead of environment variables
- [ ] **Environment Documentation**: `.env.example` updated with new variables
- [ ] **Test Files**: Corresponding test file exists in `__tests__/`
- [ ] **Mocks**: All dependencies properly mocked in tests
- [ ] **README**: Updated with new examples if needed
- [ ] **Exports**: Auto-generated (don't manually edit)
- [ ] **Build**: `yarn build` succeeds

---

## 8. Development Workflow

### Daily Development Cycle

```bash
# 1. Start development
git checkout -b feature/your-feature

# 2. Make changes to source files
vim src/services/new-service.ts

# 3. Create corresponding test file
vim __tests__/services/new-service.test.ts

# 4. Run tests frequently
yarn test

# 5. Check coverage
yarn test --coverage

# 6. Update .env.example if new environment variables added
vim .env.example

# 7. Generate documentation
yarn docs

# 8. Update README if needed
vim README.md

# 9. Verify build
yarn build

# 10. Commit changes
git add .
git commit -m "feat: add new service with tests and docs"

# 11. Push and create PR
git push origin feature/your-feature
```

### Pre-commit Verification

```bash
# Run all checks
yarn test && yarn build && echo "✅ Ready to commit"
```

---

## 9. Common Patterns and Anti-Patterns

### ✅ Recommended Patterns

```typescript
// Dependency injection
export class Service {
  constructor(private deps: Dependencies) {}
}

// Parameter-based configuration
export function initialize(config: Config) {}

// Comprehensive documentation
/** @example usage here */

// Small, focused files
// 500-700 lines max

// Isolated unit tests with mocks
jest.mock('./dependency');
```

### ❌ Anti-Patterns to Avoid

```typescript
// Direct environment variable access (except ENV/NODE_ENV)
const apiKey = process.env.API_KEY;  // ❌

// Missing test files
// src/services/user.ts exists
// __tests__/services/user.test.ts missing  // ❌

// Large monolithic files
// 1500+ lines in a single file  // ❌

// Missing documentation examples
/** Does something */  // ❌ No example

// Manual export management
// Editing auto-generated index.ts  // ❌
```

---

## 10. Resources and Tools

### Essential Commands

```bash
# Testing
yarn test                    # Run tests with coverage
yarn test --watch           # Run tests in watch mode
yarn test --coverage        # Generate coverage report

# Building
yarn build                  # Production build
yarn build:dev             # Development build

# Documentation
yarn docs                   # Generate TypeDoc documentation

# Release
./release.sh               # Execute release process
node update-version.js     # Update version number
```

### File Structure Reference

```
project-name/
├── src/                    # Source files (500-700 lines each)
│   ├── cli.ts             # Environment variable handling
│   ├── server.ts          # Server configuration
│   ├── index.ts           # Main entry point
│   ├── responses.ts       # Response utilities
│   ├── services/          # Service implementations
│   │   ├── index.ts       # Auto-generated exports
│   │   └── user-service.ts # User service
│   └── utils/             # Utility functions
│       ├── index.ts       # Auto-generated exports
│       └── validators.ts  # Validation utilities
├── __tests__/             # Test files (MIRRORS src structure exactly)
│   ├── cli.test.ts
│   ├── server.test.ts
│   ├── index.test.ts
│   ├── responses.test.ts
│   ├── services/
│   │   ├── index.test.ts
│   │   └── user-service.test.ts
│   └── utils/
│       ├── index.test.ts
│       └── validators.test.ts
├── docs/                  # Generated TypeDoc documentation
├── coverage/              # Test coverage reports
├── package.json           # Dependencies and scripts
├── jest.config.ts         # Jest configuration
├── tsconfig.json          # TypeScript configuration
├── webpack.config.js      # Webpack configuration
├── release.sh             # Release automation script
└── README.md              # Project-specific documentation
```

---

## Summary

This document establishes the foundation for consistent, high-quality development across all projects. All AI agents and developers must adhere to these guidelines to maintain code quality, testability, and maintainability.

**Key Principles**:
1. **Test everything** with >85% coverage
2. **Document everything** with examples
3. **Keep files small** (500-700 lines)
4. **Follow SOLID** principles
5. **Centralize configuration** in cli.ts
6. **Automate exports** - never edit manually
7. **Maintain project-specific README** with current examples

For questions or clarifications, refer to existing project code or consult the development team.

---


