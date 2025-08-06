import getStatusCode, { addStatusCodes } from '../src/status-codes';

describe('status code utilities', () => {
  it('returns exact code when available', () => {
    const sc = getStatusCode(200);
    expect(sc.status).toBe(200);
  });

  it('returns added custom status', () => {
    addStatusCodes([{ status: 201, code: 1, description: 'created-alt', error: false, success: true }]);
    const sc = getStatusCode(201, 1);
    expect(sc.description).toBe('created-alt');
  });

  it('falls back to group code', () => {
    const sc = getStatusCode(250);
    expect(sc.status).toBe(200);
  });

  it('returns unknown error when no match', () => {
    const sc = getStatusCode(999);
    expect(sc.description).toBe('unknown-error');
  });

  it('throws when adding invalid code', () => {
    expect(() => addStatusCodes([{ code: 1 } as any])).toThrow('missing status');
  });
});
