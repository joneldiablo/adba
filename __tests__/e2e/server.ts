import { createTestApp, cleanupTestApp, TestApp } from './test-app';

let server: any;
let testApps: TestApp[] = [];

export async function setupE2EServer(port: number = 3000): Promise<void> {
  const express = await import('express');
  const cors = require('cors');
  
  const app = express();
  app.use(cors());
  app.use(express.json());

  console.log('\n=== Setting up E2E test server ===\n');

  const dbTypes = ['sqlite', 'mysql', 'postgres', 'mssql'];
  
  for (const dbType of dbTypes) {
    try {
      const testApp = await createTestApp(dbType);
      testApps.push(testApp);
      app.use(testApp.baseUrl, (await import('../src/express-router')).expressRouter(
        (await import('../src/generate-models')).routesObject(
          await (await import('../src/generate-models')).generateModels(testApp.knex)
        )
      ));
      console.log(`✓ ${testApp.name} mounted at ${testApp.baseUrl}`);
    } catch (e) {
      console.log(`✗ ${dbType} failed: ${(e as Error).message}`);
    }
  }

  return new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`\n=== E2E server running on http://localhost:${port} ===\n`);
      resolve();
    });
  });
}

export async function teardownE2EServer(): Promise<void> {
  if (server) {
    server.close();
  }
  for (const app of testApps) {
    await cleanupTestApp(app);
  }
}

if (require.main === module) {
  setupE2EServer().then(() => {
    console.log('Server ready for manual testing...');
  }).catch(console.error);
}