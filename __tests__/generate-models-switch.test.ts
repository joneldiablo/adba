import { generateModels } from '../src/generate-models';
import { generateSQLiteModels } from '../src/generate-sqlite-models';
import { generatePostgreSQLModels } from '../src/generate-postgresql-models';
import { generateMySQLModels } from '../src/generate-mysql-models';
import { generateMSSQLModels } from '../src/generate-mssql-models';

jest.mock('../src/generate-sqlite-models');
jest.mock('../src/generate-postgresql-models');
jest.mock('../src/generate-mysql-models');
jest.mock('../src/generate-mssql-models');

const mockedSQLite = generateSQLiteModels as jest.Mock;
const mockedPg = generatePostgreSQLModels as jest.Mock;
const mockedMysql = generateMySQLModels as jest.Mock;
const mockedMssql = generateMSSQLModels as jest.Mock;

beforeEach(() => {
  mockedSQLite.mockResolvedValue({ sqlite: true });
  mockedPg.mockResolvedValue({ pg: true });
  mockedMysql.mockResolvedValue({ mysql: true });
  mockedMssql.mockResolvedValue({ mssql: true });
});

describe('generateModels database switch', () => {
  const knex: any = { client: { config: { client: '' } } };

  it('uses sqlite generator', async () => {
    knex.client.config.client = 'sqlite';
    const res = await generateModels(knex);
    expect(mockedSQLite).toHaveBeenCalledWith(knex, {});
    expect(res).toEqual({ sqlite: true });
  });

  it('uses postgres generator', async () => {
    knex.client.config.client = 'pg';
    const res = await generateModels(knex);
    expect(mockedPg).toHaveBeenCalledWith(knex, {});
    expect(res).toEqual({ pg: true });
  });

  it('uses mysql generator', async () => {
    knex.client.config.client = 'mysql2';
    const res = await generateModels(knex);
    expect(mockedMysql).toHaveBeenCalledWith(knex, {});
    expect(res).toEqual({ mysql: true });
  });

  it('uses mssql generator', async () => {
    knex.client.config.client = 'mssql';
    const res = await generateModels(knex);
    expect(mockedMssql).toHaveBeenCalledWith(knex, {});
    expect(res).toEqual({ mssql: true });
  });

  it('throws on unsupported client', async () => {
    knex.client.config.client = 'oracle';
    await expect(generateModels(knex)).rejects.toThrow('Unsupported database client: oracle');
  });
});
