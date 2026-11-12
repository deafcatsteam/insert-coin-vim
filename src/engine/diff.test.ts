import { expect, test } from 'vitest';
import { diffSpan } from './diff';

const parts = (a: string, b: string): [string, string] => {
  const { from, toA, toB } = diffSpan(a, b);
  return [a.slice(from, toA), b.slice(from, toB)];
};

test.each([
  ['let x = foo;', 'let x = bar;', 'foo', 'bar'],
  ['  one two', '  ne two', 'o', ''],
  ['ab', 'aXb', '', 'X'],
  ['aaa', 'aa', 'a', ''],
  ['same\n', 'same', '', ''],
  ['', 'new', '', 'new'],
  ['a 1 b 2 c', 'a 9 b 8 c', '1 b 2', '9 b 8'],
])('%j against %j differs by %j and %j', (a, b, inA, inB) => {
  expect(parts(a, b)).toEqual([inA, inB]);
});
