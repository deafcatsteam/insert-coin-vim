import { expect, test } from 'vitest';
import { matches } from './match';

test.each([
  ['a\nb', 'a\nb', true],
  ['a\nb', 'a\nb\n', true],
  ['a\nb\n', 'a\nb', true],
  // Only one final newline is ignored.
  ['a\nb', 'a\nb\n\n', false],
  ['a b', 'a  b', false],
  ['a ', 'a', false],
  ['A', 'a', false],
  ['', '', true],
])('matches(%j, %j) is %j', (buffer, target, expected) => {
  expect(matches(buffer, target)).toBe(expected);
});
