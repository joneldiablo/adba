import { jsonSchemaToColumns } from '../src/model-utilities';
import { JSONSchema } from 'objection';

describe('jsonSchemaToColumns', () => {
  test('converts schema to columns', () => {
    const schema: Record<string, JSONSchema> = {
      id: { type: 'integer', $comment: 'integer' },
      name: { type: 'string', title: 'Name' },
      created: { type: 'string', format: 'date' }
    };
    const columns = jsonSchemaToColumns(schema, ['id']);
    expect(columns.id.required).toBe(true);
    expect(columns.name.label).toBe('Name');
    expect(columns.created.format).toBe('date');
  });
});
