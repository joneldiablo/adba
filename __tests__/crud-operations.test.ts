import { Model } from "objection";
import Controller from "../src/controller";
import { generateModels } from "../src/generate-models";
import setupDatabase from "./utils/db-sqlite";

describe("TEST PATCH /:id - Update by ID", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  describe("PATCH /:id - Integer ID", () => {
    test("should update record with integer ID", async () => {
      const updateData = {
        id: 1,
        text_column: "Updated with integer ID",
        integer_column: 999,
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 1 });
      expect(checkResponse.data.text_column).toBe("Updated with integer ID");
      expect(checkResponse.data.integer_column).toBe(999);
    });

    test("should return success for non-existent ID", async () => {
      const updateData = {
        id: 999999,
        text_column: "Non-existent",
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);
    });

    test("should update multiple fields", async () => {
      const updateData = {
        id: 1,
        text_column: "Multiple fields updated",
        integer_column: 777,
        real_column: 123.45,
        boolean_column: false,
        string_column: "Updated string",
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 1 });
      expect(checkResponse.data.text_column).toBe("Multiple fields updated");
      expect(checkResponse.data.integer_column).toBe(777);
      expect(checkResponse.data.real_column).toBe(123.45);
    });

    test("should update only specified fields (partial update)", async () => {
      const beforeResponse = await apiController.selectById({ id: 1 });
      const originalTextColumn = beforeResponse.data.text_column;

      const updateData = {
        id: 1,
        integer_column: 555,
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 1 });
      expect(checkResponse.data.integer_column).toBe(555);
      expect(checkResponse.data.text_column).toBe(originalTextColumn);
    });
  });

  describe("PATCH /:id - Edge Cases", () => {
    test("should handle negative ID", async () => {
      const updateData = {
        id: -1,
        text_column: "Negative ID",
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);
    });

    test("should handle very large ID", async () => {
      const updateData = {
        id: 9999999999,
        text_column: "Large ID",
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);
    });
  });

  describe("PATCH /:id - Error Handling", () => {
    test("should handle undefined ID gracefully", async () => {
      const updateData = {
        text_column: "No ID provided",
      };

      const response = await apiController.update(updateData as any);
      expect(response.success).toBe(true);
    });
  });
});

describe("TEST POST with filters in body", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  describe("POST / - Filters in body object", () => {
    test("should filter with equality in body", async () => {
      const searchData = {
        filters: {
          integer_column: 1
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
       expect(response.data.data.length).toBeGreaterThan(0);
    });

    test("should filter with operators in body", async () => {
      const searchData = {
        filters: {
          integer_column: { $gte: 2, $lt: 4 }
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should filter with array in body", async () => {
      const searchData = {
        filters: {
          integer_column: [1, 2]
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should filter with $in operator in body", async () => {
      const searchData = {
        filters: {
          integer_column: { $in: [1, 2] }
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should filter with $between in body", async () => {
      const searchData = {
        filters: {
          integer_column: { $between: [1, 3] }
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should filter with string like in body", async () => {
      const searchData = {
        filters: {
          text_column: { $like: "%Example%" }
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should combine filters in body", async () => {
      const searchData = {
        filters: {
          integer_column: 1,
          boolean_column: true
        },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should work with orderBy in body", async () => {
      const searchData = {
        filters: {},
        orderBy: { integer_column: "desc" },
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should work with q in body", async () => {
      const searchData = {
        q: "Text",
        limit: 10,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
    });

    test("should work with only pagination (no filters)", async () => {
      const searchData = {
        limit: 2,
        page: 0
      };
      const response = await apiController.list(searchData);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });
});

describe("TEST PATCH with batch update (upsert)", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  describe("PATCH / (batch update)", () => {
    test("should update single record with update key", async () => {
      const updateData = {
        update: {
          id: 1,
          text_column: "Batch update single",
          integer_column: 100,
        }
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 1 });
      expect(checkResponse.data.text_column).toBe("Batch update single");
    });

    test("should update multiple records with array", async () => {
      const updateData = {
        update: [
          { id: 1, text_column: "Batch 1" },
          { id: 2, text_column: "Batch 2" }
        ]
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);
    });

    test("should handle empty update array", async () => {
      const updateData = {
        update: []
      };

      const response = await apiController.update(updateData);
      expect(response.success).toBe(true);
    });

    test("should return error without update data", async () => {
      const response = await apiController.update({} as any);
      expect(response.success).toBe(false);
    });
  });
});

describe("TEST DELETE /:id", () => {
  let database: any;
  let models: Record<string, typeof Model>;
  let apiController: Controller;

  beforeAll(async () => {
    database = await setupDatabase();
    models = await generateModels(database);
  });

  beforeEach(() => {
    const TestOneModel = models["TestOneTableModel"];
    apiController = new Controller(TestOneModel);
  });

  afterAll(async () => {
    await database.destroy();
  });

  describe("DELETE /:id - Delete by ID", () => {
    test("should delete record by ID", async () => {
      await apiController.insert({ insert: {
        id: 700,
        integer_column: 700,
        text_column: "To delete",
      }});

      const deleteResponse = await apiController.delete({ id: 700 });
      expect(deleteResponse.success).toBe(true);

      const checkResponse = await apiController.selectById({ id: 700 });
      expect(checkResponse.success).toBe(false);
    });

    test("should return success for non-existent ID", async () => {
      const deleteResponse = await apiController.delete({ id: 999999 });
      expect(deleteResponse.success).toBe(true);
    });

    test("should delete multiple IDs", async () => {
      await apiController.insert({ insert: { id: 702, integer_column: 702, text_column: "Multi 1" } });
      await apiController.insert({ insert: { id: 703, integer_column: 703, text_column: "Multi 2" } });

      const deleteResponse = await apiController.delete({ ids: [702, 703] });
      expect(deleteResponse.success).toBe(true);
    });
  });
});