import { Model } from "objection";
import Controller from "../src/controller";
import { generateMySQLModels } from "../src/generate-mysql-models";
import { createMysqlDatabase, cleanupMysqlDatabase } from "./utils/db-mysql";
import moment from "moment";

describe("TEST Controller MySQL - test-one table", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await createMysqlDatabase();
    models = await generateMySQLModels(database);
  }, 60000);

  beforeEach(() => {
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await cleanupMysqlDatabase(database);
  });

  describe("GET /meta - Schema", () => {
    test("meta should return table metadata", async () => {
      const response = await apiController.meta();
      expect(response.success).toBe(true);
      expect(response.data.tableName).toBe(models.TestOneTableModel.tableName);
      expect(response.data.jsonSchema).toBeDefined();
      expect(response.data.columns).toBeDefined();
    });

    test("meta should contain id column", async () => {
      const response = await apiController.meta();
      expect(response.data.columns.id).toBeDefined();
      expect(response.data.columns.id.name).toBe("id");
    });

    test("meta should contain all expected columns", async () => {
      const response = await apiController.meta();
      const columnNames = Object.keys(response.data.columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("integer_column");
      expect(columnNames).toContain("text_column");
      expect(columnNames).toContain("real_column");
      expect(columnNames).toContain("boolean_column");
      expect(columnNames).toContain("datetime_column");
      expect(columnNames).toContain("decimal_column");
      expect(columnNames).toContain("string_column");
    });
  });

  describe("GET / - Listado con pagination", () => {
    test("list should return data with default pagination", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 10, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.total).toBeGreaterThan(0);
      expect(response.data.limit).toBe(10);
      expect(response.data.page).toBe(0);
    });

    test("list should respect limit parameter", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 2, page: 0 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeLessThanOrEqual(2);
      expect(response.data.limit).toBe(2);
    });

    test("list should respect page parameter", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 1, page: 1 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.page).toBe(1);
    });

    test("list should return empty array when page out of range", async () => {
      const searchData = { filters: {}, orderBy: {}, limit: 10, page: 100 };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data).toEqual([]);
    });
  });

  describe("GET / - Filtros (filters)", () => {
    test("list with exact filter should return matching records", async () => {
      const searchData = { 
        filters: { integer_column: 1 }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0].integer_column).toBe(1);
    });

    test("list with $gte operator should return records >= value", async () => {
      const searchData = { 
        filters: { integer_column: { $gte: 2 } }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThanOrEqual(2);
      });
    });

    test("list with $lt operator should return records < value", async () => {
      const searchData = { 
        filters: { integer_column: { $lt: 3 } }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeLessThan(3);
      });
    });

    test("list with $ne operator should return non-matching records", async () => {
      const searchData = { 
        filters: { integer_column: { $ne: 1 } }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).not.toBe(1);
      });
    });

    test("list with $in operator should return records in array", async () => {
      const searchData = { 
        filters: { integer_column: { $in: [1, 2] } }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect([1, 2]).toContain(row.integer_column);
      });
    });

    test("list with multiple filters should apply all", async () => {
      const searchData = { 
        filters: { integer_column: 1, boolean_column: true }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBe(1);
        expect(row.boolean_column).toBe(true);
      });
    });
  });

  describe("GET / - Búsqueda (q)", () => {
    test("list with q parameter should search in text columns", async () => {
      const searchData = { 
        q: "Text Example 1", 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    test("list with q parameter should return empty when no match", async () => {
      const searchData = { 
        q: "nonexistent_text_xyz", 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data.data).toEqual([]);
    });
  });

  describe("GET / - Ordenación (orderBy)", () => {
    test("list with orderBy ascending should sort correctly", async () => {
      const searchData = { 
        filters: {}, 
        orderBy: { integer_column: "asc" }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      const values = response.data.data.map((r: any) => r.integer_column);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    });

    test("list with orderBy descending should sort correctly", async () => {
      const searchData = { 
        filters: {}, 
        orderBy: { integer_column: "desc" }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      const values = response.data.data.map((r: any) => r.integer_column);
      expect(values).toEqual([...values].sort((a, b) => b - a));
    });

    test("list with multiple orderBy columns", async () => {
      const searchData = { 
        filters: {}, 
        orderBy: { boolean_column: "desc", integer_column: "asc" }, 
        limit: 10, 
        page: 0 
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });
  });

  describe("POST / - Filtros avanzados en body", () => {
    test("POST with complex filters should return matching records", async () => {
      const searchData = {
        filters: { integer_column: { $gte: 1, $lt: 3 } },
        orderBy: { integer_column: "asc" },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThanOrEqual(1);
        expect(row.integer_column).toBeLessThan(3);
      });
    });

    test("POST with $between operator", async () => {
      const searchData = {
        filters: { integer_column: { $between: [1, 3] } },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      response.data.data.forEach((row: any) => {
        expect(row.integer_column).toBeGreaterThanOrEqual(1);
        expect(row.integer_column).toBeLessThanOrEqual(3);
      });
    });

    test("POST with string filter using like", async () => {
      const searchData = {
        filters: { text_column: { $like: "%Example%" } },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });
  });

  describe("PUT / - Inserción (single)", () => {
    test("insert single record should add data to the table", async () => {
      const newData = {
        id: 100,
        integer_column: 100,
        text_column: "Test Insert Single",
        real_column: 99.99,
        boolean_column: true,
         datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),

        decimal_column: 123.45,
        string_column: "Insert Test",
      };

      const response = await apiController.insert({ insert: newData });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(100);

      const checkResponse = await apiController.selectById({ id: 100 });
      expect(checkResponse.success).toBe(true);
      expect(checkResponse.data.text_column).toBe("Test Insert Single");
    });
  });

  describe("PUT / - Inserción (multiple)", () => {
    test("insert multiple records should add all data to the table", async () => {
      const newData = [
        {
          id: 101,
          integer_column: 101,
          text_column: "Multi Insert 1",
          real_column: 10.1,
          boolean_column: true,
          datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
          decimal_column: 10.1,
          string_column: "Multi 1",
        },
        {
          id: 102,
          integer_column: 102,
          text_column: "Multi Insert 2",
          real_column: 20.2,
          boolean_column: false,
          datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
          decimal_column: 20.2,
          string_column: "Multi 2",
        },
      ];

      const response = await apiController.insert({ insert: newData });
      expect(response.success).toBe(true);

      const listResponse = await apiController.list({ 
        filters: { id: { $in: [101, 102] } }, 
        orderBy: {},
        limit: 10, 
        page: 0 
      });
      expect(listResponse.data.data.length).toBe(2);
    });
  });

  describe("PATCH / - Modificación en lote (upsert)", () => {
    test("update single record with id should modify the record", async () => {
      const updateData = {
        update: {
          id: 100,
          text_column: "Updated Single",
          integer_column: 200,
        }
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 100 });
      expect(checkResponse.data.text_column).toBe("Updated Single");
      expect(checkResponse.data.integer_column).toBe(200);
    });

    test("update multiple records should modify all", async () => {
      const updateData = {
        update: [
          { id: 101, text_column: "Updated Multi 1" },
          { id: 102, text_column: "Updated Multi 2" },
        ]
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const listResponse = await apiController.list({ 
        filters: { id: { $in: [101, 102] } }, 
        orderBy: {},
        limit: 10, 
        page: 0 
      });
      expect(listResponse.data.data[0].text_column).toBe("Updated Multi 1");
      expect(listResponse.data.data[1].text_column).toBe("Updated Multi 2");
    });
  });

  describe("PATCH /:id - Modificación unitaria", () => {
    test("update by ID should modify specific record", async () => {
      const updateData = {
        id: 100,
        text_column: "Unit Update",
        integer_column: 300,
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 100 });
      expect(checkResponse.data.text_column).toBe("Unit Update");
      expect(checkResponse.data.integer_column).toBe(300);
    });
  });

  describe("DELETE /:id - Eliminación unitaria", () => {
    test("delete by ID should remove specific record", async () => {
      const deleteResponse = await apiController.delete({ id: 100 });
      expect(deleteResponse.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 100 });
      expect(checkResponse.success).toBe(false);
    });
  });

  describe("DELETE / - Eliminación en lote", () => {
    test("delete with filters should remove matching records", async () => {
      await apiController.insert({ insert: {
        id: 200,
        integer_column: 200,
        text_column: "To Delete",
        real_column: 50.0,
        boolean_column: true,
         datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),

        decimal_column: 50.0,
        string_column: "Delete Me",
      }});

      const deleteCondition = { id: 200 } as any;
      const deleteResponse = await apiController.deleteWhere(deleteCondition);
      expect(deleteResponse.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 200 });
      expect(checkResponse.success).toBe(false);
    });
  });

  describe("GET /:id - Obtener por ID", () => {
    test("selectById should return a row by ID", async () => {
      const response = await apiController.selectById({ id: 1 });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
    });

    test("selectById should return error for non-existent ID", async () => {
      const response = await apiController.selectById({ id: 999999 });
      expect(response.success).toBe(false);
    });
  });

  describe("GET /:name - Obtener por nombre", () => {
    test("selectByName should return a row by name field", async () => {
      const newData = {
        id: 300,
        name: "TestNameMySQL",
        integer_column: 300,
        text_column: "TestNameMySQL",
        real_column: 99.99,
        boolean_column: true,
        datetime_column: moment().format('YYYY-MM-DD HH:mm:ss'),
        decimal_column: 123.45,
        string_column: "Test String",
      };


      await apiController.insert({ insert: newData });
      
      const response = await apiController.selectByName({ name: "TestNameMySQL" });
      expect(response.success).toBe(true);
      expect(response.data.text_column).toBe("TestNameMySQL");
    });

    test("selectByName should return error for non-existent name", async () => {
      const response = await apiController.selectByName({ name: "NonExistentName" });
      expect(response.success).toBe(false);
    });
  });

  describe("findTypeString", () => {
    test("findTypeString should return string fields from the model", () => {
      const result = apiController.findTypeString();
      expect(result).toContain("text_column");
      expect(result).toContain("string_column");
    });
  });
});

describe("TEST Controller MySQL - test_two table", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await createMysqlDatabase();
    models = await generateMySQLModels(database);
  }, 60000);

  beforeEach(() => {
    const TestTwoModel = models["TestTwoTableModel"];
    apiController = new Controller(TestTwoModel);
  });

  afterAll(async () => {
    await cleanupMysqlDatabase(database);
  });

  test("list should work on test_two table", async () => {
    const searchData = { filters: {}, orderBy: {}, limit: 10, page: 0 };
    const response = await apiController.list(searchData);
    expect(response.success).toBe(true);
    expect(response.data.total).toBeGreaterThan(0);
  });
});