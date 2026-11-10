import { expect, test } from 'vitest';
import { parseKeys } from './keys';

test.each([
  ['dd', ['d', 'd']],
  ['ciwfoo<Esc>', ['c', 'i', 'w', 'f', 'o', 'o', '<Esc>']],
  ['<C-v>jj', ['<C-v>', 'j', 'j']],
  ['<C-[>', ['<C-[>']],
  ['<S-Left>', ['<S-Left>']],
  [':s/a/b/<CR>', [':', 's', '/', 'a', '/', 'b', '/', '<CR>']],
  // Unknown names are literal text, not one key.
  ['i<div><Esc>', ['i', '<', 'd', 'i', 'v', '>', '<Esc>']],
  ['', []],
])('parseKeys(%j)', (notation, keys) => {
  expect(parseKeys(notation)).toEqual(keys);
});
