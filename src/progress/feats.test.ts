import { expect, test } from 'vitest';
import { golfPack, levels, shortest } from '../levels/levels';
import { parseKeys } from '../scoring/keys';
import { badges, gained, themes } from './feats';
import type { LevelResult, Save } from './save';

const save = (
  ok: (chapter: number) => LevelResult | undefined,
  more: Partial<Save> = {},
): Save => {
  const results: Record<string, LevelResult> = {};
  for (const level of levels) {
    const result = ok(level.chapter);
    if (result) results[level.id] = result;
  }
  return { version: 1, levels: results, ...more };
};
const last = levels.at(-1)?.chapter ?? -1;

test('no save, no theme and no badge', () => {
  expect(themes(save(() => undefined))).toEqual([]);
  expect(badges(save(() => undefined))).toEqual([]);
});

test('each theme has its own feat', () => {
  expect(
    themes(save((c) => (c === 0 ? { stars: 3, keys: 1 } : undefined))),
  ).toEqual(['phosphor']);
  expect(
    themes(save(() => undefined, { speedrun: { 4: { ms: 1, splits: [1] } } })),
  ).toEqual(['ice']);
  expect(
    themes(save((c) => (c === last ? { stars: 1, keys: 1 } : undefined))),
  ).toEqual(['paper']);
  expect(themes(save(() => ({ stars: 1, keys: 1 })))).toEqual([
    'olive',
    'paper',
  ]);
});

test('a chapter with one level short of ★★★ gives no Phosphor', () => {
  const s = save((c) => (c === 0 ? { stars: 3, keys: 1 } : undefined));
  const first = levels[0]?.id ?? '';
  s.levels[first] = { stars: 2, keys: 1 };
  expect(themes(s)).toEqual([]);
});

test('each badge has its own feat', () => {
  const clean = { stars: 1, keys: 1, noHints: true, noArrows: true } as const;
  expect(badges(save((c) => (c === 2 ? clean : undefined)))).toEqual([
    'noHints',
    'noArrows',
  ]);
  expect(badges(save(() => ({ stars: 3, keys: 1 })))).toEqual([
    'campaign',
    'stars',
  ]);
  const chapters = [...new Set(levels.map((l) => l.chapter))];
  const runs = Object.fromEntries(
    chapters.map((c) => [c, { ms: 1, splits: [1] }]),
  );
  expect(badges(save(() => undefined, { speedrun: runs }))).toEqual([
    'speedrun',
  ]);
  const missing = Object.fromEntries(
    chapters.slice(1).map((c) => [c, { ms: 1, splits: [1] }]),
  );
  expect(badges(save(() => undefined, { speedrun: missing }))).toEqual([]);
  const puzzle = golfPack[0];
  if (!puzzle) throw new Error('no golf pack');
  const ref = parseKeys(shortest(puzzle)).length;
  expect(
    badges(save(() => undefined, { golf: { [puzzle.id]: ref + 1 } })),
  ).toEqual([]);
  expect(badges(save(() => undefined, { golf: { [puzzle.id]: ref } }))).toEqual(
    ['golf'],
  );
});

test('gained lists what the second save adds only', () => {
  const before = save((c) => (c === 0 ? { stars: 3, keys: 1 } : undefined));
  const after = save(() => ({ stars: 3, keys: 1 }));
  expect(gained(before, after)).toEqual({
    themes: ['olive', 'paper'],
    badges: ['campaign', 'stars'],
  });
  expect(gained(after, after)).toEqual({ themes: [], badges: [] });
});
