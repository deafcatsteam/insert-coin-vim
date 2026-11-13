import { beforeEach, expect, test } from 'vitest';
import { stars } from '../scoring/stars';
import {
  exportSave,
  importSave,
  loadSave,
  recordResult,
  recordReview,
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

test('a damaged stored save reads as empty', () => {
  localStorage.setItem('insert-coin-save', '{');
  expect(loadSave()).toEqual({ version: 1, levels: {} });
});
