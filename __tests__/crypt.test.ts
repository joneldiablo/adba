import { encrypt, decrypt, generateCode, buildToken, readToken, generatePasswordHash, verifyPasswordHash, getClientType } from '../src/crypt';

describe('crypt utilities', () => {
  test('encrypt/decrypt round trip', () => {
    const { encryptedData, iv } = encrypt('hello', 'pass', '');
    const plain = decrypt(encryptedData, 'pass', iv);
    expect(plain).toBe('hello');
  });

  test('generateCode creates 6 digit codes', () => {
    const code = generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  test('password hashing and verification', async () => {
    const hash = await generatePasswordHash('secret');
    expect(typeof hash).toBe('string');
    const ok = await verifyPasswordHash('secret', hash as string);
    expect(ok).toBe(true);
    const bad = await verifyPasswordHash('wrong', hash as string);
    expect(bad).toBe(false);
  });

  test('buildToken/readToken round trip', () => {
    const { iv } = encrypt('x', 'pass', '');
    const token = buildToken({ payload: { foo: 'bar' } }, 'pass', iv, '1h');
    const data = readToken(token, 'pass', iv);
    expect((data as any).payload.foo).toBe('bar');
  });

  test('getClientType parses user agent', () => {
    const type = getClientType('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    expect(type).toBe('Chrome');
  });
});
