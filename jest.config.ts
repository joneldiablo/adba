import type { JestConfigWithTsJest } from "ts-jest";

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
  testMatch: ['**/__tests__/**/*.test.ts'],
   testPathIgnorePatterns: [
     '/e2e/', 
     '/utils/db-mysql', 
     '/utils/db-postgres', 
     '/utils/db-mssql',
     // Integration tests: require an external DB (see jest.config.e2e.ts / scripts/run-e2e.sh)
     '/__tests__/mysql-controller.test.ts',
     '/__tests__/postgres-controller.test.ts',
     '/__tests__/mssql-controller.test.ts'
   ],

  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|.*flat.*)'],
  coveragePathIgnorePatterns: ['/node_modules/', '/e2e/', '/utils/']
};

export default config;
