import formatData, { addRuleActions } from '../src/format-data';

describe('formatData utility', () => {
  test('converts number to string', () => {
    const data = { val: 5 };
    const rules = { val: 'string' } as any;
    expect(formatData(data, rules)).toEqual({ val: '5' });
  });

  test('joins array values', () => {
    const data = { tags: ['a', 'b'] };
    const rules = { tags: ['array', ':join'] } as any;
    expect(formatData(data, rules)).toEqual({ tags: 'a,b' });
  });

  test('supports custom rule actions', () => {
    addRuleActions({
      ':upper': (v: string) => v.toUpperCase(),
    });
    const data = { name: 'john' };
    const rules = { name: ['string', ':upper'] } as any;
    expect(formatData(data, rules)).toEqual({ name: 'JOHN' });
  });

  test('uses replace function', () => {
    const data = { a: 1, b: 2 };
    const rules = {
      a: [':replace', undefined, (_k: string, val: number, src: any) => val + src.b],
    } as any;
    expect(formatData(data, rules)).toEqual({ a: 3 });
  });
});
