import { pascalCase } from "change-case-all";
import { Model, JSONSchema } from "objection";

export function getModelByTableName(tableName: string, models: Record<string, typeof Model>) {
  return Object.values(models).find(
    (ModelIn) => ModelIn.tableName === tableName
  );
}

/**
 * Converts a string into PascalCase, suitable for class names.
 * Handles strings in kebab-case or snake_case.
 * @param str - The input string.
 * @returns The converted PascalCase string.
 */
export function className(str: string): string {
  return pascalCase(str);
}

export interface ITableColumn {
  name: string;
  label: string;
  type?: string;
  format?: string;
  required?: boolean;
}

/**
 * Converts JSON schema properties to the column format expected by the Table component.
 *
 * @param schemaProperties - Properties section of a JSON schema.
 * @param required - List of required property names.
 * @returns Columns in the Table component format.
 */
export function jsonSchemaToColumns(
  schemaProperties: Record<string, JSONSchema>,
  required: string[] = []
): Record<string, ITableColumn> {
  const columns: Record<string, ITableColumn> = {};

  for (const [key, prop] of Object.entries(schemaProperties)) {
    const column: ITableColumn = {
      name: key,
      label: (prop as any).title || key,
    };

    const comment = (prop as any).$comment as string | undefined;
    if (comment) {
      const [t, f] = comment.split('.');
      column.type = t || (prop.type as string | undefined);
      if (f) column.format = f;
    } else if (typeof prop.type === 'string') {
      column.type = prop.type;
    }

    if (typeof (prop as any).format === 'string') {
      column.format = (prop as any).format;
    }

    if (required.includes(key)) column.required = true;

    columns[key] = column;
  }

  return columns;}