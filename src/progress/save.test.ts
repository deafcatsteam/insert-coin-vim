import { beforeEach, expect, test } from 'vitest';
import { stars } from '../scoring/stars';
import { exportSave, importSave, loadSave, recordResult } from './save';

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

test('a damaged stored save reads as empty', () => {
  localStorage.setItem('insert-coin-save', '{');
  expect(loadSave()).toEqual({ version: 1, levels: {} });
});
