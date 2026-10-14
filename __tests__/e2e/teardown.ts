import { cleanupTestApp } from './test-app';

export default async function teardown() {
  console.log('\n=== Cleaning up E2E tests ===\n');

  const testApp = (global as any).testApp;

  if (testApp) {
    try {
      await cleanupTestApp(testApp);
      console.log(`✓ Cleaned up ${testApp.name}`);
    } catch (e) {
      console.log(`✗ Failed to cleanup ${testApp.name}: ${(e as Error).message}`);
    }
  }

  const cleanupServer = (global as any).cleanupServer;
  if (cleanupServer) {
    await cleanupServer();
  }

  console.log('\n=== E2E teardown complete ===\n');
}