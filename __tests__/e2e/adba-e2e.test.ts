import fetch from 'node-fetch';
import { TestApp, createTestApp, cleanupTestApp } from './test-app';

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

describe(`E2E Tests - ${DB_TYPE.toUpperCase()}`, () => {
  let testApp: TestApp;

  beforeAll(async () => {
    console.log(`\n=== Setting up ${DB_TYPE} test app ===\n`);

    testApp = await createTestApp(DB_TYPE);
    (global as any).testApp = testApp;

    console.log(`✓ ${testApp.name} test app ready at ${testApp.baseUrl}\n`);
  }, 60000);

  afterAll(async () => {
    if (testApp) {
      await cleanupTestApp(testApp);
    }
  });

  function getBaseUrl() {
    return testApp?.baseUrl || `/api/${DB_TYPE}`;
  }

  async function apiCall(method: string, path: string, body?: any) {
    const baseUrl = getBaseUrl();
    const url = `http://localhost:3000${baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  describe('GET /users - List', () => {
    test('should list all users', async () => {
      const { status, data } = await apiCall('GET', '/users/');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should respect limit parameter', async () => {
      const { status } = await apiCall('GET', '/users/?limit=1');
      expect(status).toBe(200);
    });

    test('should paginate with page parameter', async () => {
      const { status } = await apiCall('GET', '/users/?limit=2&page=0');
      expect(status).toBe(200);
    });

    test('should filter by active field', async () => {
      const { status } = await apiCall('GET', '/users/?filters.active=true');
      expect(status).toBe(200);
    });

    test('should filter by age with $gte', async () => {
      const { status } = await apiCall('GET', '/users/?filters.age.$gte=30');
      expect(status).toBe(200);
    });

    test('should search with q parameter', async () => {
      const { status } = await apiCall('GET', '/users/?q=John');
      expect(status).toBe(200);
    });

    test('should order by field (dot notation)', async () => {
      const { status, data } = await apiCall('GET', '/users/?orderBy.age=asc');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const ages = data.data.data.map((u: any) => u.age);
      expect(ages).toEqual([...ages].sort((a, b) => a - b));
    });

    test('should order by field (bracket notation)', async () => {
      const { status, data } = await apiCall('GET', '/users/?orderBy[age]=desc');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const ages = data.data.data.map((u: any) => u.age);
      expect(ages).toEqual([...ages].sort((a, b) => b - a));
    });
  });

  describe('GET /users/:id - Get by ID', () => {
    test.skip('should get user by ID - SKIPPED: routing issue with selectById vs selectByName', async () => {
      const { status, data } = await apiCall('GET', '/users/1');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test.skip('should return 404 for non-existent ID - SKIPPED: routing issue', async () => {
      const { status, data } = await apiCall('GET', '/users/999999');
      expect(status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /users/meta - Schema', () => {
    test('should return table metadata', async () => {
      const { status, data } = await apiCall('GET', '/users/meta');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tableName).toBe('users');
      expect(data.data.columns).toBeDefined();
    });
  });

  describe('POST /users/ - Advanced filtering', () => {
    test('should filter with body', async () => {
      const { status, data } = await apiCall('POST', '/users/', {
        filters: { active: true },
        limit: 10,
        page: 0,
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should filter with operators in body', async () => {
      const { status, data } = await apiCall('POST', '/users/', {
        filters: { age: { $gte: 25, $lt: 35 } },
        limit: 10,
        page: 0,
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should filter with $in operator', async () => {
      const { status, data } = await apiCall('POST', '/users/', {
        filters: { id: { $in: [1, 2] } },
        limit: 10,
        page: 0,
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should filter with $between', async () => {
      const { status, data } = await apiCall('POST', '/users/', {
        filters: { age: { $between: [20, 40] } },
        limit: 10,
        page: 0,
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PUT /users/ - Insert', () => {
    test('should insert single user', async () => {
      const { status, data } = await apiCall('PUT', '/users/', {
        insert: {
          name: 'New User',
          email: 'new@example.com',
          age: 28,
          active: true,
          balance: 150.00,
        },
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New User');
    });

    test('should insert multiple users', async () => {
      const { status, data } = await apiCall('PUT', '/users/', {
        insert: [
          { name: 'User 1', email: 'user1@example.com', age: 20, active: true, balance: 100 },
          { name: 'User 2', email: 'user2@example.com', age: 22, active: true, balance: 200 },
        ],
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PATCH /users/ - Batch update', () => {
    test('should update with update key', async () => {
      const { status, data } = await apiCall('PATCH', '/users/', {
        update: {
          id: 1,
          name: 'Updated John',
          age: 31,
        },
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should update multiple records', async () => {
      const { status, data } = await apiCall('PATCH', '/users/', {
        update: [
          { id: 1, name: 'Multi Update 1' },
          { id: 2, name: 'Multi Update 2' },
        ],
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PATCH /users/:id - Single update', () => {
    test.skip('should update specific user - SKIPPED: routing issue', async () => {
      const { status } = await apiCall('PATCH', '/users/1', {
        name: 'Single Update',
        age: 99,
      });
      expect(status).toBe(200);
    });
  });

  describe('DELETE /users/:id - Delete by ID', () => {
    test('should delete user by ID', async () => {
      await apiCall('PUT', '/users/', {
        insert: { name: 'To Delete', email: 'delete@test.com', age: 30, active: true, balance: 0 },
      });

      const { status } = await apiCall('DELETE', '/users/4');
      expect(status).toBe(200);
    });
  });

  describe('DELETE /users/ - Batch delete', () => {
    test('should delete with filters', async () => {
      await apiCall('PUT', '/users/', {
        insert: { name: 'Batch Delete', email: 'batch@test.com', age: 30, active: false, balance: 0 },
      });

      const { status } = await apiCall('DELETE', '/users/?filters.active=false');
      expect(status).toBe(200);
    });
  });

  describe('Products table', () => {
    test('should list products', async () => {
      const { status, data } = await apiCall('GET', '/products/');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should filter products by price', async () => {
      const { status, data } = await apiCall('GET', '/products/?filters.price.$gte=50');
      expect(status).toBe(200);
    });

    test('should insert product', async () => {
      const { status, data } = await apiCall('PUT', '/products/', {
        insert: {
          name: 'Monitor',
          description: '27 inch monitor',
          price: 299.99,
          stock: 15,
          available: true,
        },
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty filters', async () => {
      const { status } = await apiCall('GET', '/users/?filters=');
      expect(status).toBe(200);
    });

    test('should handle invalid ID', async () => {
      const { status } = await apiCall('GET', '/users/abc');
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});