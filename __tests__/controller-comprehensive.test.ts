import { Model } from "objection";
import Controller from "../src/controller";
import { generateModels } from "../src/generate-models";
import setupDatabase from "./utils/db-sqlite";

describe("TEST Controller Comprehensive - test-one table", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    console.log('Available models:', Object.keys(models));
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel, { searchIn: ['text_column', 'string_column'] });
  });

  afterAll(async () => {
    await database.destroy();
  });

  describe("findTypeString", () => {
    test("should return string fields from the model", () => {
      const result = apiController.findTypeString();
      expect(result).toContain("text_column");
      expect(result).toContain("string_column");
      expect(result).toContain("datetime_column");
    });

    test("should accept custom model parameter", () => {
      const TestOneModel = models["TestOneTableModel"];
      const result = apiController.findTypeString(TestOneModel);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("GET / - List with pagination", () => {
    test("should return data with default pagination", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.total).toBeGreaterThan(0);
      expect(response.data.limit).toBe(10);
      expect(response.data.page).toBeDefined();
    });

    test("should respect limit parameter", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 2, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeLessThanOrEqual(2);
      expect(response.data.limit).toBe(2);
    });

    test("should respect page parameter", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 1, page: 1 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.page).toBeDefined();
    });

    test("should return empty when page out of range", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 10, page: 100 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data).toEqual([]);
    });

    test("should work with limit: false for no pagination", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: false, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe("GET / - Filters (filters)", () => {
    test("should filter by exact integer value", async () => {
      const searchData = { filters: { integer_column: 1 }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0].integer_column).toBe(1);
    });

    test("should filter with $gte operator", async () => {
      const searchData = { filters: { integer_column: { $gte: 2 } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThanOrEqual(2);
      });
    });

    test("should filter with $gt operator", async () => {
      const searchData = { filters: { integer_column: { $gt: 1 } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThan(1);
      });
    });

    test("should filter with $lte operator", async () => {
      const searchData = { filters: { integer_column: { $lte: 2 } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeLessThanOrEqual(2);
      });
    });

    test("should filter with $lt operator", async () => {
      const searchData = { filters: { integer_column: { $lt: 3 } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeLessThan(3);
      });
    });

    test("should filter with $ne operator", async () => {
      const searchData = { filters: { integer_column: { $ne: 1 } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).not.toBe(1);
      });
    });

    test("should filter with $in operator", async () => {
      const searchData = { filters: { integer_column: { $in: [1, 2] } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect([1, 2]).toContain(row.integer_column);
      });
    });

    test("should filter with $nin operator", async () => {
      const searchData = { filters: { integer_column: { $nin: [1] } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).not.toBe(1);
      });
    });

    test("should filter with $between operator", async () => {
      const searchData = { filters: { integer_column: { $between: [1, 3] } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThanOrEqual(1);
        expect(row.integer_column).toBeLessThanOrEqual(3);
      });
    });

    test("should filter with $nbetween operator", async () => {
      const searchData = { filters: { integer_column: { $nbetween: [2, 3] } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeLessThan(2);
      });
    });

    test("should filter with $like operator", async () => {
      const searchData = { filters: { text_column: { $like: "Text%" } }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    test("should filter with multiple filters", async () => {
      const searchData = { filters: { integer_column: 1, text_column: "Test 1" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBe(1);
      });
    });

    test("should filter with array values", async () => {
      const searchData = { filters: { integer_column: [1, 2, 3] }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });
  });
 
  describe("GET / - Search (q parameter)", () => {
    test("should search in text columns", async () => {
      const searchData = { q: "Text Example 1", limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should return empty when no match", async () => {
      const searchData = { q: "nonexistent_text_xyz", limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should work with custom searchIn option", async () => {
      const searchData = { q: "Sample", limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });
  });

  describe("GET / - OrderBy (orderBy)", () => {
    test("should order by ascending", async () => {
      const searchData = { filters: {}, orderBy: { integer_column: "asc" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      const values = response.data.data.map((r: any) => r.integer_column);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    });

    test("should order by descending", async () => {
      const searchData = { filters: {}, orderBy: { integer_column: "desc" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      const values = response.data.data.map((r: any) => r.integer_column);
      expect(values).toEqual([...values].sort((a, b) => b - a));
    });

    test("should order by multiple columns", async () => {
      const searchData = { filters: {}, orderBy: { boolean_column: "desc", integer_column: "asc" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should default to asc for invalid direction", async () => {
      const searchData = { filters: {}, orderBy: { integer_column: "invalid" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });
  });

  describe("applyOrderByLite", () => {
    test("should apply order by with table prefix", async () => {
      const searchData = { filters: {}, orderBy: { "test-one.integer_column": "asc" }, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should handle empty orderBy", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });
  });

  describe("GET /:id - selectById", () => {
    test("should return a row by ID", async () => {
      const response = await apiController.selectById({ id: 1 });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
    });

    test("should return error for non-existent ID", async () => {
      const response = await apiController.selectById({ id: 999999 });
      expect(response.success).toBe(false);
    });
  });

  describe("GET /:name - selectByName", () => {
    test("should return a row by name field", async () => {
      await apiController.insert({ insert: {
        id: 300,
        integer_column: 300,
        text_column: "TestNameSearch",
        real_column: 99.99,
        boolean_column: true,
        datetime_column: new Date().toISOString(),
        decimal_column: 123.45,
        string_column: "Test String",
      }});
      
      const response = await apiController.selectByName({ name: "TestNameSearch" });
      expect(response.success).toBe(true);
      expect(response.data.text_column).toBe("TestNameSearch");
    });

    test("should return error for non-existent name", async () => {
      const response = await apiController.selectByName({ name: "NonExistentName" });
      expect(response.success).toBe(false);
    });
  });

  describe("selectOne", () => {
    test("should return a row by criteria", async () => {
      const response = await apiController.selectOne({ integer_column: 1 });
      expect(response.success).toBe(true);
      expect(response.data.integer_column).toBe(1);
    });

    test("should return error when no match", async () => {
      const response = await apiController.selectOne({ integer_column: 999999 });
      expect(response.success).toBe(false);
    });
  });

  describe("selectOneActive", () => {
    test("should return active row by criteria", async () => {
      const response = await apiController.selectOneActive({ integer_column: 1 });
      expect(response.success).toBe(true);
    });

    test("should return error when no active match", async () => {
      const response = await apiController.selectOneActive({ integer_column: 999999 });
      expect(response.success).toBe(false);
    });
  });

  describe("PUT / - insert", () => {
    test("should insert single record", async () => {
      const newData = {
        id: 400,
        integer_column: 400,
        text_column: "Test Insert Single",
        real_column: 99.99,
        boolean_column: true,
        datetime_column: new Date().toISOString(),
        decimal_column: 123.45,
        string_column: "Insert Test",
      };

      const response = await apiController.insert({ insert: newData });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(400);

      const checkResponse = await apiController.selectById({ id: 400 });
      expect(checkResponse.success).toBe(true);
      expect(checkResponse.data.text_column).toBe("Test Insert Single");
    });

    test("should insert multiple records", async () => {
      const newData = [
        {
          id: 401,
          integer_column: 401,
          text_column: "Multi Insert 1",
          real_column: 10.1,
          boolean_column: true,
          datetime_column: new Date().toISOString(),
          decimal_column: 10.1,
          string_column: "Multi 1",
        },
        {
          id: 402,
          integer_column: 402,
          text_column: "Multi Insert 2",
          real_column: 20.2,
          boolean_column: false,
          datetime_column: new Date().toISOString(),
          decimal_column: 20.2,
          string_column: "Multi 2",
        },
      ];

      const response = await apiController.insert({ insert: newData });
      expect(response.success).toBe(true);

      const listResponse = await apiController.list({ 
        filters: { id: { $in: [401, 402] } }, 
        limit: 10, 
        page: 0 
      });
      expect(listResponse.data.data.length).toBe(2);
    });
  });

  describe("PATCH / - update (upsert)", () => {
    test("should update single record with id in data", async () => {
      const updateData = {
        update: {
          id: 400,
          text_column: "Updated Single",
          integer_column: 500,
        }
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 400 });
      expect(checkResponse.data.text_column).toBe("Updated Single");
      expect(checkResponse.data.integer_column).toBe(500);
    });

    test("should update multiple records", async () => {
      const updateData = {
        update: [
          { id: 401, text_column: "Updated Multi 1" },
          { id: 402, text_column: "Updated Multi 2" },
        ]
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const listResponse = await apiController.list({ 
        filters: { id: { $in: [401, 402] } }, 
        limit: 10, 
        page: 0 
      });
       expect(listResponse.data.data[0].text_column).toBe("Updated Multi 1");
       expect(listResponse.data.data[1].text_column).toBe("Updated Multi 2");
    });

    test("should update without update key (direct)", async () => {
      const updateData = {
        id: 400,
        text_column: "Direct Update",
        integer_column: 600,
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 400 });
      expect(checkResponse.data.text_column).toBe("Direct Update");
    });

    test("should return error when no update data provided", async () => {
      const response = await apiController.update({} as any);
      expect(response.success).toBe(false);
    });
  });

  describe("DELETE /:id - delete", () => {
    test("should delete by ID", async () => {
      const deleteResponse = await apiController.delete({ id: 400 });
      expect(deleteResponse.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 400 });
      expect(checkResponse.success).toBe(false);
    });

    test("should delete multiple IDs", async () => {
      await apiController.insert({ insert: { id: 500, integer_column: 500, text_column: "Delete 1" } });
      await apiController.insert({ insert: { id: 501, integer_column: 501, text_column: "Delete 2" } });
      
      const deleteResponse = await apiController.delete({ ids: [500, 501] });
      expect(deleteResponse.success).toBe(true);
    });
  });

  describe("DELETE / - deleteWhere", () => {
    test("should delete with filters", async () => {
      await apiController.insert({ insert: {
        id: 600,
        integer_column: 600,
        text_column: "To Delete",
        real_column: 50.0,
        boolean_column: true,
        datetime_column: new Date().toISOString(),
        decimal_column: 50.0,
        string_column: "Delete Me",
      }});

      const condition = { integer_column: 600 } as any;
      const deleteResponse = await apiController.deleteWhere(condition);
      expect(deleteResponse.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 600 });
      expect(checkResponse.success).toBe(false);
    });
  });

  describe("GET /meta - meta", () => {
    test("should return table metadata", async () => {
      const response = await apiController.meta();
      expect(response.success).toBe(true);
      expect(response.data.tableName).toBe(models.TestOneTableModel.tableName);
      expect(response.data.jsonSchema).toBeDefined();
      expect(response.data.columns).toBeDefined();
    });

    test("should contain id column", async () => {
      const response = await apiController.meta();
      expect(response.data.columns.id).toBeDefined();
      expect(response.data.columns.id.name).toBe("id");
    });

    test("should contain all expected columns", async () => {
      const response = await apiController.meta();
      const columnNames = Object.keys(response.data.columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("integer_column");
      expect(columnNames).toContain("text_column");
    });
  });

  describe("Error handling", () => {
    test("should handle database errors gracefully", async () => {
      const response = await apiController.list({ filters: {}, limit: 10, page: 0 });
      expect(response.success).toBe(true);
    });
  });
});

describe("TEST Controller - test_two table", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestTwoModel = models["TestTwoTableModel"];
    apiController = new Controller(TestTwoModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  test("should work on test_two table", async () => {
    const searchData = { filters: {}, limit: 10, page: 0 };
    const response = await apiController.list(searchData);
    expect(response.success).toBe(true);
    expect(response.data.total).toBeGreaterThan(0);
  });
});

describe("TEST Controller - __testables table", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestAblesModel = models["TestablesTableModel"];
    apiController = new Controller(TestAblesModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  test("should work on __testables table", async () => {
    const searchData = { filters: {}, limit: 10, page: 0 };
    const response = await apiController.list(searchData);
    expect(response.success).toBe(true);
  });
});