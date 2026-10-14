import { Response } from 'express';

export const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnValue(res),
    json: jest.fn().mockReturnValue(res),
    send: jest.fn().mockReturnValue(res),
    set: jest.fn().mockReturnValue(res),
  };
  return res as Response;
};

export const mockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  ...overrides,
});

export const mockNext = jest.fn();

export default {
  mockResponse,
  mockRequest,
  mockNext,
};