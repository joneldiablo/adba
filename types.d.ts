type IValueTypes = 'string' | 'boolean' | 'number' | 'array' | 'object';
type IRuleAction = ':remove' | ':replace' | ':jsonStr' | ':jsonObj' |
  ':datetime' | ':date' | ':time' | ':booleanStr' |
  ':join' | ':join:tab' | ':join:nl' | ':join:|' |
  ':boolean' | ':sortAsc' | ':sortDesc';
type IRule = IValueTypes | boolean | IRuleAction;
type IRuleArray = [
  IRule,
  undefined | IRuleAction | IRules,
  undefined | ((colName: string, value: any, data: { [key: string]: any }) => any)
];
type IRules = { [key: string]: IRule | IRuleArray };
type IExtraRules = { [key: string]: ((value: any) => any) };