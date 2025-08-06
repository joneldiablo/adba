import {
  mapSqliteTypeToJsonType,
  mapSqliteTypeToJsonFormat,
} from '../src/generate-sqlite-models';
import {
  mapMySqlTypeToJsonType,
  mapMySqlTypeToJsonFormat,
} from '../src/generate-mysql-models';
import {
  mapPostgresTypeToJsonType,
  mapPostgresTypeToJsonFormat,
} from '../src/generate-postgresql-models';
import {
  mapMssqlTypeToJsonType,
  mapMssqlTypeToJsonFormat,
} from '../src/generate-mssql-models';

describe('DB type mapping utilities', () => {
  test('sqlite type mapping', () => {
    expect(mapSqliteTypeToJsonType('INTEGER')).toBe('integer');
    expect(mapSqliteTypeToJsonFormat('DATETIME', 'col')).toBe('datetime');
  });

  test('mysql type mapping', () => {
    expect(mapMySqlTypeToJsonType('VARCHAR')).toBe('string');
    expect(mapMySqlTypeToJsonFormat('DATE', 'd')).toBe('date');
  });

  test('postgres type mapping', () => {
    expect(mapPostgresTypeToJsonType('BYTEA')).toBe('buffer');
    expect(mapPostgresTypeToJsonFormat('TIME', 't')).toBe('time');
  });

  test('mssql type mapping', () => {
    expect(mapMssqlTypeToJsonType('INT')).toBe('integer');
    expect(mapMssqlTypeToJsonFormat('DATE', 'd')).toBe('date');
  });
});
