import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { createTestApp } from './test-app';

let server: any;

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

export default async function setup() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  console.log(`\n=== Starting E2E Test Server for ${DB_TYPE} ===\n`);

  try {
    const testApp = await createTestApp(DB_TYPE);
    (global as any).testApp = testApp;

    app.use('/', testApp.app);
    console.log(`✓ ${testApp.name} ready`);

    console.log(`\n=== ${testApp.name} database ready ===\n`);

    return new Promise<void>((resolve) => {
      server = app.listen(3000, () => {
        console.log(`E2E server running on http://localhost:3000\n`);
        resolve();
      });
    });
  } catch (e) {
    console.error(`✗ Failed to start: ${(e as Error).message}`);
    throw e;
  }
}

(global as any).cleanupServer = async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
};