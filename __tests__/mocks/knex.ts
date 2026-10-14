/* eslint-disable @typescript-eslint/no-explicit-any */
export const mockKnex: any = {
  queryBuilder: jest.fn(() => mockKnex),
  schema: {
    createTable: jest.fn().mockResolvedValue(true),
    hasTable: jest.fn().mockResolvedValue(true),
    dropTableIfExists: jest.fn().mockResolvedValue(true),
  },
  raw: jest.fn().mockResolvedValue({ rows: [] }),
  select: jest.fn(() => mockKnex),
  insert: jest.fn().mockResolvedValue([1]),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(1),
  where: jest.fn(() => mockKnex),
  whereIn: jest.fn(() => mockKnex),
  whereNotIn: jest.fn(() => mockKnex),
  whereBetween: jest.fn(() => mockKnex),
  whereNotBetween: jest.fn(() => mockKnex),
  whereNull: jest.fn(() => mockKnex),
  whereNotNull: jest.fn(() => mockKnex),
  orWhere: jest.fn(() => mockKnex),
  orderBy: jest.fn(() => mockKnex),
  limit: jest.fn(() => mockKnex),
  offset: jest.fn(() => mockKnex),
  page: jest.fn().mockResolvedValue({ total: 10, results: [] }),
  then: jest.fn().mockResolvedValue([]),
  catch: jest.fn().mockResolvedValue(null),
  clone: jest.fn(() => mockKnex),
  copyFrom: jest.fn(),
  ref: jest.fn((col: string) => ({ toString: () => col })),
  fn: {
    now: jest.fn().mockReturnValue(new Date()),
  },
};

export const createMockKnex = (overrides: any = {}) => ({
  ...mockKnex,
  ...overrides,
});

export default mockKnex;