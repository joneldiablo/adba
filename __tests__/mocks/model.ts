export interface MockModelType {
  tableName: string;
  jsonSchema: any;
  query: any;
  knex: any;
}

export const createMockModel = (config: {
  tableName?: string;
  jsonSchema?: any;
  queryMock?: any;
}): MockModelType => ({
  tableName: config.tableName || 'test_table',
  jsonSchema: config.jsonSchema || {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
    },
  },
  query: config.queryMock || jest.fn(),
  knex: jest.fn().mockReturnValue({
    ref: jest.fn((col: string) => ({ toString: () => col })),
  }),
});

export const mockModels = {
  TestUser: createMockModel({
    tableName: 'users',
    jsonSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
      },
      required: ['name', 'email'],
    },
  }),
  TestProduct: createMockModel({
    tableName: 'products',
    jsonSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'integer' },
      },
      required: ['name'],
    },
  }),
};

export default createMockModel;