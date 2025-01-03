import moment from 'moment';
import type { IExtraRules, IRuleAction, IRuleArray, IRules } from './types';

/** 
 * Stores additional custom rules that can be added dynamically 
 */
const extraRules: IExtraRules = {};

/**
 * Adds more rule actions to the `extraRules` object.
 * @param moreRules - An object containing rules to be added.
 */
export function addRuleActions(moreRules: IExtraRules) {
  // Merge existing rules with new ones
  Object.assign(extraRules, moreRules);
}

/**
 * Applies given rule to the provided value using custom logic.
 * @param ruleIn - Determines what rule should be applied.
 * @param value - The value to transform.
 * @param defaultFunc - Function to apply as default.
 * @returns The value after transformation.
 */
function ruleActionReplace(ruleIn: boolean | IRuleAction, value: any, defaultFunc = (v: any) => v) {
  switch (ruleIn) {
    case ':jsonStr':
      return JSON.stringify(value);
    case ':jsonObj':
      return JSON.parse(value);
    case ':datetime':
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    case ':date':
      return moment(value).format('YYYY-MM-DD');
    case ':time':
      return moment(value).format('HH:mm:ss');
    case ':booleanStr':
      return !value ? 'FALSE' : 'TRUE';
    case ':boolean':
      return !!value;
    case ':join':
      return value.join(',');
    case ':join:tab':
      return value.join('\t');
    case ':join:nl':
      return value.join('\n');
    case ':join:|':
      return value.join('|');
    case ':sortAsc':
      return value.sort((a: any, b: any) => a - b);
    case ':sortDesc':
      return value.sort((a: any, b: any) => b - a);
    default:
      if (extraRules[ruleIn as string]) {
        return extraRules[ruleIn as string](value);
      }
      return defaultFunc(value);
  }
}

/**
 * Formats data according to the provided rules.
 * @param data - The object where keys are field names and values are the data to format.
 * @param rules - The object containing rules to use for formatting.
 * @returns Returns a new object with formatted values.
 */
export default function formatData(data: { [key: string]: any }, rules: IRules) {
  const toReturn = Object.entries(data).reduce((r: { [key: string]: any }, [key, value]) => {
    const colName = key;
    const [ruleType, arg2, replaceFunc]: IRuleArray = [rules[colName]].flat() as IRuleArray;
    const ruleIn: IRuleAction | boolean = typeof arg2 === 'string' && arg2;
    const subrules: IRules | boolean = typeof arg2 === 'object' && arg2;
    const willRemove = ruleIn === ':remove';

    switch (ruleType) {
      case ':replace': {
        if (typeof replaceFunc !== 'function')
          throw new Error("Missing replaceFunc");
        const replace = replaceFunc(colName, value, data);
        if (replace !== undefined) r[colName] = replace;
        return r;
      }
      case ':remove':
      case false:
        return r;
      case true:
        if (value !== undefined) r[colName] = value;
        break;
      case 'string':
        if (willRemove && typeof value !== 'string') return r;
        if (value === null) r[colName] = value;
        else if (value !== undefined) {
          r[colName] = ruleActionReplace(ruleIn, value, (v) => v.toString());
        }
        break;
      case 'boolean':
        if (willRemove && typeof value !== 'boolean') return r;
        if (value === null) r[colName] = value;
        else if (value !== undefined) {
          r[colName] = ruleActionReplace(ruleIn, value, (v) => (!v ? 0 : 1));
        }
        break;
      case 'number':
        if (willRemove && typeof value !== 'number') return r;
        if (value === null) r[colName] = value;
        else if (value !== undefined) {
          r[colName] = ruleActionReplace(ruleIn, value, (v) => (Number(v) || 0));
        }
        break;
      case 'array':
        if (willRemove && !Array.isArray(value)) return r;
        if (value === null) r[colName] = [];
        else if (value !== undefined) {
          r[colName] = ruleActionReplace(ruleIn, [value].flat());
          if (subrules) r[colName] = formatData(r[colName], subrules);
        }
        break;
      case 'object':
        if (willRemove && typeof value !== 'object') return r;
        if (value === null) r[colName] = value;
        else if (value !== undefined) {
          r[colName] = ruleActionReplace(ruleIn, value);
          if (subrules) r[colName] = formatData(r[colName], subrules);
        }
        break;
      default:
        break;
    }
    return r;
  }, {});
  return toReturn;
}
