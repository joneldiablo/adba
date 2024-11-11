import { pascalCase } from "change-case-all";
import { Model } from "objection";

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