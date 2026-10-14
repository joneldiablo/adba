import type { JestConfigWithTsJest } from "ts-jest";

// The per-DB controller integration test that matches the current DB_TYPE.
// e.g. DB_TYPE=mysql -> runs __tests__/mysql-controller.test.ts
const DB_TYPE = process.env.DB_TYPE || "sqlite";
const controllerByDb: Record<string, string> = {
  mysql: "mysql-controller",
  postgres: "postgres-controller",
  mssql: "mssql-controller",
};
const dbController = controllerByDb[DB_TYPE];

const config: JestConfigWithTsJest = {
  verbose: true,
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: [
    '**/__tests__/e2e/**/*.test.ts',
    ...(dbController ? [`**/__tests__/${dbController}.test.ts`] : []),
  ],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|.*flat.*)'],
  testTimeout: 60000,
  globalSetup: './__tests__/e2e/setup.ts',
  globalTeardown: './__tests__/e2e/teardown.ts',
};

export default config;