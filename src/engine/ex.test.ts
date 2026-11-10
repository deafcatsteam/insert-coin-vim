import { Vim } from '@replit/codemirror-vim';
import { expect, test } from 'vitest';
import { replay } from './replay';

// SPEC §6 chapter 0: the game decides what ":w" and ":q" do, not the plugin.
test('":w", ":q", ":wq" and ":q!" can be intercepted', () => {
  const seen: string[] = [];
  for (const [name, prefix] of [
    ['write', 'w'],
    ['quit', 'q'],
    ['wq', 'wq'],
  ] as const)
    Vim.defineEx(name, prefix, (_cm, params) => {
      seen.push(`${name}: ${params.input}`);
    });

  for (const keys of [':w<CR>', ':q<CR>', ':wq<CR>', ':q!<CR>'])
    expect(replay({ start: 'abc' }, keys).buffer).toBe('abc');

  expect(seen).toEqual(['write: w', 'quit: q', 'wq: wq', 'quit: q!']);
});
