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
  testMatch: ['**/__tests__/e2e/**/*.test.ts'],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|.*flat.*)'],
  testTimeout: 60000,
  globalSetup: './__tests__/e2e/setup.ts',
  globalTeardown: './__tests__/e2e/teardown.ts',
};

export default config;