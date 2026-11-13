import { expect, test } from 'vitest';
import { dueLevels, isCard, nextCards, sooner } from './review';

test('a weak level sends its concepts to box 0, due the next day', () => {
  expect(nextCards({ a: { box: 2, due: 30 } }, ['a', 'b'], true, 10)).toEqual({
    a: { box: 0, due: 11 },
    b: { box: 0, due: 11 },
  });
});

test('a due concept climbs the boxes, then leaves the queue', () => {
  let cards = nextCards({}, ['a'], true, 10);
  cards = nextCards(cards, ['a'], false, 11);
  expect(cards).toEqual({ a: { box: 1, due: 14 } });
  cards = nextCards(cards, ['a'], false, 14);
  expect(cards).toEqual({ a: { box: 2, due: 21 } });
  // Late is fine: a concept due long ago still climbs.
  expect(nextCards(cards, ['a'], false, 40)).toEqual({});
});

test('a success before the due day changes nothing', () => {
  const cards = { a: { box: 0, due: 11 } };
  expect(nextCards(cards, ['a'], false, 10)).toEqual(cards);
  // A good level with a concept that was never weak adds nothing.
  expect(nextCards({}, ['b'], false, 10)).toEqual({});
});

test('the input cards stay as they were', () => {
  const cards = { a: { box: 0, due: 11 } };
  nextCards(cards, ['a'], true, 20);
  expect(cards).toEqual({ a: { box: 0, due: 11 } });
});

test('of two cards, the one that comes back first wins', () => {
  expect(sooner({ box: 2, due: 5 }, { box: 0, due: 9 })).toEqual({
    box: 2,
    due: 5,
  });
  expect(sooner({ box: 2, due: 5 }, { box: 1, due: 5 })).toEqual({
    box: 1,
    due: 5,
  });
  expect(sooner({ box: 2, due: 5 }, undefined)).toEqual({ box: 2, due: 5 });
});

test.each([
  [{ box: 0, due: 1 }, true],
  [{ box: 2, due: 99 }, true],
  [{ box: 3, due: 1 }, false],
  [{ box: -1, due: 1 }, false],
  [{ box: 0, due: 0 }, false],
  [{ box: 0.5, due: 1 }, false],
  [{ box: '0', due: 1 }, false],
  [{ due: 1 }, false],
  [null, false],
])('isCard(%j) is %s', (card, ok) => {
  expect(isCard(card)).toBe(ok);
});

const levels = [
  { id: 'x', concepts: ['a'] },
  { id: 'y', concepts: ['a', 'b'] },
  { id: 'z', concepts: ['c'] },
];

test('the queue holds levels of due concepts, most overdue first', () => {
  const save = {
    version: 1 as const,
    levels: { x: { stars: 3, keys: 1 }, y: { stars: 1, keys: 9 } },
    review: {
      a: { box: 0, due: 8 },
      b: { box: 0, due: 9 },
      c: { box: 1, due: 5 },
      // Not due yet.
      gone: { box: 0, due: 11 },
    },
  };
  // c first, the most overdue. a and b both pick y, the level with fewer stars.
  expect(dueLevels(save, levels, 10)).toEqual([2, 1]);
  expect(dueLevels(save, levels, 4)).toEqual([]);
});

test('a concept no level teaches is left out, and an old save has no queue', () => {
  const save = { version: 1 as const, levels: {} };
  expect(dueLevels(save, levels, 10)).toEqual([]);
  expect(
    dueLevels({ ...save, review: { removed: { box: 0, due: 1 } } }, levels, 10),
  ).toEqual([]);
});
