import { beforeEach, expect, test } from 'vitest';
import { stars } from '../scoring/stars';
import {
  exportSave,
  importSave,
  loadSave,
  recordResult,
  recordReview,
  recordGolf,
  recordRun,
} from './save';

beforeEach(() => {
  localStorage.clear();
});

test('stars follow par and optimal', () => {
  const level = { par: 8, optimal: 5 };
  expect([5, 6, 8, 9].map((keys) => stars(keys, level))).toEqual([3, 2, 2, 1]);
});

test('keeps the best result of a level', () => {
  recordResult('a', { stars: 2, keys: 7 });
  recordResult('a', { stars: 1, keys: 12 });
  expect(loadSave().levels).toEqual({ a: { stars: 2, keys: 7 } });
  recordResult('a', { stars: 2, keys: 6 });
  expect(recordResult('a', { stars: 3, keys: 9 })).toEqual({
    stars: 3,
    keys: 9,
  });
});

test('an import merges and never lowers a result', () => {
  recordResult('a', { stars: 3, keys: 5 });
  const file = exportSave();
  localStorage.clear();
  recordResult('a', { stars: 1, keys: 20 });
  recordResult('b', { stars: 2, keys: 4 });

  importSave(file);
  expect(loadSave().levels).toEqual({
    a: { stars: 3, keys: 5 },
    b: { stars: 2, keys: 4 },
  });
});

test.each([
  'not json',
  'null',
  '{"version":2,"levels":{}}',
  '{"version":1,"levels":{"a":{"stars":9,"keys":1}}}',
  '{"version":1,"levels":{"a":null}}',
])('refuses the file %s and keeps the save', (file) => {
  recordResult('a', { stars: 1, keys: 3 });
  expect(() => {
    importSave(file);
  }).toThrow();
  expect(loadSave().levels).toEqual({ a: { stars: 1, keys: 3 } });
});

test('a save from before review mode still loads, then gets a queue', () => {
  localStorage.setItem(
    'insert-coin-save',
    '{"version":1,"levels":{"a":{"stars":2,"keys":4}}}',
  );
  expect(loadSave()).toEqual({
    version: 1,
    levels: { a: { stars: 2, keys: 4 } },
  });
  recordReview(['c'], true, 10);
  recordResult('a', { stars: 3, keys: 3 });
  // A new result keeps the queue.
  expect(loadSave()).toEqual({
    version: 1,
    levels: { a: { stars: 3, keys: 3 } },
    review: { c: { box: 0, due: 11 } },
  });
});

test('an import keeps, per concept, the card that comes back first', () => {
  recordReview(['a', 'b'], true, 10);
  const file = exportSave();
  localStorage.clear();
  recordReview(['a'], true, 20);
  recordReview(['c'], true, 20);

  importSave(file);
  const merged = {
    a: { box: 0, due: 11 },
    b: { box: 0, due: 11 },
    c: { box: 0, due: 21 },
  };
  expect(loadSave().review).toEqual(merged);
  // A file from before review mode leaves the queue alone.
  importSave('{"version":1,"levels":{}}');
  expect(loadSave().review).toEqual(merged);
});

test.each([
  '{"version":1,"levels":{},"review":null}',
  '{"version":1,"levels":{},"review":"a"}',
  '{"version":1,"levels":{},"review":{"a":{"box":7,"due":1}}}',
  '{"version":1,"levels":{},"review":{"a":{"box":0}}}',
])('refuses the review queue in %s', (file) => {
  recordReview(['a'], true, 10);
  expect(() => {
    importSave(file);
  }).toThrow();
  expect(loadSave().review).toEqual({ a: { box: 0, due: 11 } });
});

test('a bad stored review queue is dropped, the level results stay', () => {
  localStorage.setItem(
    'insert-coin-save',
    '{"version":1,"levels":{"a":{"stars":2,"keys":4}},"review":{"b":{"box":3,"due":1}}}',
  );
  expect(loadSave()).toEqual({
    version: 1,
    levels: { a: { stars: 2, keys: 4 } },
  });
});

test('a damaged stored save reads as empty', () => {
  localStorage.setItem('insert-coin-save', '{');
  expect(loadSave()).toEqual({ version: 1, levels: {} });
});

test('keeps the fastest run of a chapter and returns the record before it', () => {
  const slow = { ms: 9000, splits: [4000, 9000] };
  const fast = { ms: 7000, splits: [3000, 7000] };
  expect(recordRun(2, slow)).toBeUndefined();
  expect(recordRun(2, fast)).toEqual(slow);
  expect(recordRun(2, slow)).toEqual(fast);
  expect(loadSave().speedrun).toEqual({ 2: fast });
});

test('an import keeps the fastest run per chapter', () => {
  recordRun(1, { ms: 5000, splits: [5000] });
  recordRun(2, { ms: 8000, splits: [8000] });
  const file = exportSave();
  localStorage.clear();
  recordRun(1, { ms: 6000, splits: [6000] });
  recordRun(2, { ms: 7000, splits: [7000] });

  importSave(file);
  expect(loadSave().speedrun).toEqual({
    1: { ms: 5000, splits: [5000] },
    2: { ms: 7000, splits: [7000] },
  });
});

test.each([
  '{"version":1,"levels":{},"speedrun":null}',
  '{"version":1,"levels":{},"speedrun":{"1":{"ms":-1,"splits":[1]}}}',
  '{"version":1,"levels":{},"speedrun":{"1":{"ms":5,"splits":[]}}}',
  '{"version":1,"levels":{},"speedrun":{"1":{"ms":5,"splits":["a"]}}}',
])('refuses the runs in %s', (file) => {
  expect(() => {
    importSave(file);
  }).toThrow();
});

test('bad stored runs are dropped, the level results stay', () => {
  localStorage.setItem(
    'insert-coin-save',
    '{"version":1,"levels":{"a":{"stars":2,"keys":4}},"speedrun":{"1":{"ms":"x"}}}',
  );
  expect(loadSave()).toEqual({
    version: 1,
    levels: { a: { stars: 2, keys: 4 } },
  });
});

test('keeps the fewest golf keys of a level and returns the record before', () => {
  expect(recordGolf('a', 9)).toBeUndefined();
  expect(recordGolf('a', 7)).toBe(9);
  expect(recordGolf('a', 8)).toBe(7);
  expect(loadSave().golf).toEqual({ a: 7 });
  expect(loadSave().levels).toEqual({});
});

test('an import keeps the fewest golf keys per level', () => {
  recordGolf('a', 5);
  recordGolf('b', 9);
  const file = exportSave();
  localStorage.clear();
  recordGolf('a', 6);
  recordGolf('b', 8);

  importSave(file);
  expect(loadSave().golf).toEqual({ a: 5, b: 8 });
});

test.each([
  '{"version":1,"levels":{},"golf":null}',
  '{"version":1,"levels":{},"golf":{"a":0}}',
  '{"version":1,"levels":{},"golf":{"a":1.5}}',
])('refuses the golf records in %s', (file) => {
  expect(() => {
    importSave(file);
  }).toThrow();
});

test('bad stored golf records are dropped, the level results stay', () => {
  localStorage.setItem(
    'insert-coin-save',
    '{"version":1,"levels":{"a":{"stars":2,"keys":4}},"golf":{"a":"x"}}',
  );
  expect(loadSave()).toEqual({
    version: 1,
    levels: { a: { stars: 2, keys: 4 } },
  });
});
