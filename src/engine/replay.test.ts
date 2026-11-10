import { expect, test } from 'vitest';
import { matches } from './match';
import { replay } from './replay';

// The levels themselves are replayed in src/levels/levels.test.ts.
test('a wrong solution does not reach the target', () => {
  const result = replay({ start: 'one\ntwo\n' }, 'x');
  expect(result.buffer).toBe('ne\ntwo\n');
  expect(matches(result.buffer, 'one\ntwo\n')).toBe(false);
});

test('counts the keys the notation says', () => {
  expect(replay({ start: 'abc' }, ':s/a/b/<CR>x<Esc>').keys).toBe(10);
});
