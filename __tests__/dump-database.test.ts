import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Knex } from 'knex';

const execMock = jest.fn((cmd: string, cb: (error: any, result: any) => void) => {
  cb(null, { stdout: '', stderr: '' });
});

jest.mock('child_process', () => ({ exec: execMock }));

import dumpDatabase from '../src/dump-database';

describe('dumpDatabase', () => {
  test('runs sqlite commands and returns file paths', async () => {
    const knex = { client: { config: { client: 'sqlite3', connection: { filename: 'test.db' } } } } as unknown as Knex;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dump-test-'));
    const result = await dumpDatabase(knex, dir);
    const schemaFile = path.join(dir, 'schema.sql');
    const fullFile = path.join(dir, 'schema_data.sql');

    expect(result).toEqual({ schemaFile, fullFile });
    expect(execMock).toHaveBeenCalledWith(`sqlite3 "test.db" .schema > "${schemaFile}"`, expect.any(Function));
    expect(execMock).toHaveBeenCalledWith(`sqlite3 "test.db" .dump > "${fullFile}"`, expect.any(Function));
  });

  test('throws on unsupported client', async () => {
    const knex = { client: { config: { client: 'oracle', connection: {} } } } as unknown as Knex;
    await expect(dumpDatabase(knex, '/tmp')).rejects.toThrow('Dump not implemented for client oracle');
  });
});
