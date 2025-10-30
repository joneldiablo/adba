import { routesObject, addTableAlias } from "../src/express-router";
import { IRoutesObject, IExpressRouterConf } from "../src/types";
import { Model } from "objection";
import GenericController from "../src/controller";

describe("routesObject function", () => {
  class TestModel extends Model {
    static tableName = "test_table";
  }

  class TestController extends GenericController {
    constructor() {
      super(TestModel);
    }
  }

  const models = { TestModel };

  const mockControllers: Record<string, typeof GenericController> = {
    testController: TestController,
  };

  const mockConfig: IExpressRouterConf = {};

  it("should return the correct routes object", () => {
    const result: IRoutesObject = routesObject(
      models,
      mockControllers,
      mockConfig
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<IRoutesObject>>({
        "GET /test-table/": [
          "GET",
          "/test-table/",
          "list",
          TestController,
          TestModel,
        ],
        "POST /test-table/": [
          "POST",
          "/test-table/",
          "list",
          TestController,
          TestModel,
        ],
        "PUT /test-table/": [
          "PUT",
          "/test-table/",
          "insert",
          TestController,
          TestModel,
        ],
        "PATCH /test-table/": [
          "PATCH",
          "/test-table/",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /test-table/": [
          "DELETE",
          "/test-table/",
          "delete",
          TestController,
          TestModel,
        ],
        "GET /test-table/:id(\\d+)": [
          "GET",
          "/test-table/:id(\\d+)",
          "selectById",
          TestController,
          TestModel,
        ],
        "PATCH /test-table/:id(\\d+)": [
          "PATCH",
          "/test-table/:id(\\d+)",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /test-table/:id(\\d+)": [
          "DELETE",
          "/test-table/:id(\\d+)",
          "delete",
          TestController,
          TestModel,
        ],
        "GET /test-table/meta": [
          "GET",
          "/test-table/meta",
          "meta",
          TestController,
          TestModel,
        ],
        "GET /test-table/:name([\\w\\-\\d]+)": [
          "GET",
          "/test-table/:name([\\w\\-\\d]+)",
          "selectByName",
          TestController,
          TestModel,
        ],
      })
    );
  });

  it("should throw an error if model is not found", () => {
    const invalidConfig: IExpressRouterConf = {
      filters: {
        defaultAction: "excludes",
        non_existent_table: true,
      },
    };

    expect(() => {
      routesObject(models, mockControllers, invalidConfig);
    }).toThrow("Model for **non_existent_table** Not Found");
  });

  it("should not exist services for non_existent_table", () => {
    const invalidConfig: IExpressRouterConf = {
      filters: {
        defaultAction: "includes",
        non_existent_table: true,
      },
    };
    const r = routesObject(models, mockControllers, invalidConfig);
    const notKeys = [
      "GET /non-existent-table/",
      "POST /non-existent-table/",
      "PUT /non-existent-table/",
      "PATCH /non-existent-table/",
      "DELETE /non-existent-table/",
      "GET /non-existent-table/:id(\\d+)",
      "PATCH /non-existent-table/:id(\\d+)",
      "DELETE /non-existent-table/:id(\\d+)",
      "GET /non-existent-table/meta",
    ];
    notKeys.forEach((k) => {
      expect(r).not.toHaveProperty(k);
    });
  });

  it("should NOT contain other methods than select", () => {
    const discartConfig: IExpressRouterConf = {
      filters: {
        defaultAction: "includes",
        test_table: {
          defaultAction: "excludes",
          "GET /": true,
          "GET /:id(\\d+)": true,
          "GET /meta": true,
          "GET /:name([\\w\\-\\d]+)": true,
        },
      },
    };
    const result: IRoutesObject = routesObject(
      models,
      mockControllers,
      discartConfig
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<IRoutesObject>>({
        "GET /test-table/": [
          "GET",
          "/test-table/",
          "list",
          TestController,
          TestModel,
        ],
        "GET /test-table/:id(\\d+)": [
          "GET",
          "/test-table/:id(\\d+)",
          "selectById",
          TestController,
          TestModel,
        ],
        "GET /test-table/meta": [
          "GET",
          "/test-table/meta",
          "meta",
          TestController,
          TestModel,
        ],
        "GET /test-table/:name([\\w\\-\\d]+)": [
          "GET",
          "/test-table/:name([\\w\\-\\d]+)",
          "selectByName",
          TestController,
          TestModel,
        ],
      })
    );
    const notKeys = [
      "POST /test-table/",
      "PUT /test-table/",
      "PATCH /test-table/",
      "DELETE /test-table/",
      "PATCH /test-table/:id(\\d+)",
      "DELETE /test-table/:id(\\d+)",
      "GET /test-table/:name([\\w\\-\\d]+)",
    ];
    notKeys.forEach((k) => {
      expect(result).not.toHaveProperty(k);
    });
  });

  it("should NOT contain select methods and modify delete", () => {
    const discartConfig: IExpressRouterConf = {
      filters: {
        defaultAction: "includes",
        test_table: {
          defaultAction: "includes",
          "GET /": false,
          "GET /:id(\\d+)": false,
          "GET /meta": false,
          "DELETE /": "deleteWhere",
          "DELETE /:id(\\d+)": "deleteWhere",
        },
      },
    };
    const result: IRoutesObject = routesObject(
      models,
      mockControllers,
      discartConfig
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<IRoutesObject>>({
        "POST /test-table/": [
          "POST",
          "/test-table/",
          "list",
          TestController,
          TestModel,
        ],
        "PUT /test-table/": [
          "PUT",
          "/test-table/",
          "insert",
          TestController,
          TestModel,
        ],
        "PATCH /test-table/": [
          "PATCH",
          "/test-table/",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /test-table/": [
          "DELETE",
          "/test-table/",
          "deleteWhere",
          TestController,
          TestModel,
        ],
        "PATCH /test-table/:id(\\d+)": [
          "PATCH",
          "/test-table/:id(\\d+)",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /test-table/:id(\\d+)": [
          "DELETE",
          "/test-table/:id(\\d+)",
          "deleteWhere",
          TestController,
          TestModel,
        ],
      })
    );
    const notKeys = ["GET /", "GET /:id(\\d+)", "GET /test-table/meta", "GET /test-table/:name([\\w\\-\\d]+)"];
    notKeys.forEach((k) => {
      expect(result).not.toHaveProperty(k);
    });
  });

  it("should return the correct ALIAS routes object", () => {
    addTableAlias({
      test_table: "alias-for-table",
    });
    const result: IRoutesObject = routesObject(
      models,
      mockControllers,
      mockConfig
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<IRoutesObject>>({
        "GET /alias-for-table/": [
          "GET",
          "/alias-for-table/",
          "list",
          TestController,
          TestModel,
        ],
        "POST /alias-for-table/": [
          "POST",
          "/alias-for-table/",
          "list",
          TestController,
          TestModel,
        ],
        "PUT /alias-for-table/": [
          "PUT",
          "/alias-for-table/",
          "insert",
          TestController,
          TestModel,
        ],
        "PATCH /alias-for-table/": [
          "PATCH",
          "/alias-for-table/",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /alias-for-table/": [
          "DELETE",
          "/alias-for-table/",
          "delete",
          TestController,
          TestModel,
        ],
        "GET /alias-for-table/:id(\\d+)": [
          "GET",
          "/alias-for-table/:id(\\d+)",
          "selectById",
          TestController,
          TestModel,
        ],
        "PATCH /alias-for-table/:id(\\d+)": [
          "PATCH",
          "/alias-for-table/:id(\\d+)",
          "update",
          TestController,
          TestModel,
        ],
        "DELETE /alias-for-table/:id(\\d+)": [
          "DELETE",
          "/alias-for-table/:id(\\d+)",
          "delete",
          TestController,
          TestModel,
        ],
        "GET /alias-for-table/meta": [
          "GET",
          "/alias-for-table/meta",
          "meta",
          TestController,
          TestModel,
        ],
        "GET /alias-for-table/:name([\\w\\-\\d]+)": [
          "GET",
          "/alias-for-table/:name([\\w\\-\\d]+)",
          "selectByName",
          TestController,
          TestModel,
        ],
      })
    );
  });

  it("should include custom endpoints", () => {
    const cfg: IExpressRouterConf = {
      customEndpoints: {
        custom: {
          "GET /": "testController.customAction",
          "PUT /:id(\\d+)": "testController.updateAction",
        },
      },
    };

    const result: IRoutesObject = routesObject(models, mockControllers, cfg);

    expect(result).toEqual(
      expect.objectContaining<Partial<IRoutesObject>>({
        "GET /custom/": [
          "GET",
          "/custom/",
          "customAction",
          TestController,
          Model,
        ],
        "PUT /custom/:id(\\d+)": [
          "PUT",
          "/custom/:id(\\d+)",
          "updateAction",
          TestController,
          Model,
        ],
      })
    );
  });
});
