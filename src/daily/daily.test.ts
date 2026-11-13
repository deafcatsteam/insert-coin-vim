import { expect, test } from 'vitest';
import { levels } from '../levels/levels';
import { dailyIndex, dailyNumber } from './daily';

test('the day number changes at midnight UTC only', () => {
  expect(dailyNumber(new Date('2026-11-13T00:00:00Z'))).toBe(1);
  expect(dailyNumber(new Date('2026-11-13T23:59:59Z'))).toBe(1);
  expect(dailyNumber(new Date('2026-11-14T00:00:00Z'))).toBe(2);
  // Paris at 00:30 on the 14th is still the 13th in UTC.
  expect(dailyNumber(new Date('2026-11-14T00:30:00+01:00'))).toBe(1);
  expect(dailyNumber(new Date('2020-01-01T00:00:00Z'))).toBe(1);
});

const year = Array.from({ length: 365 }, (_, i) => i + 1);

test('the daily level is the same for a day and spreads over the levels', () => {
  expect(dailyIndex(42, levels)).toBe(dailyIndex(42, [...levels]));
  const picked = new Set(year.map((day) => dailyIndex(day, levels)));
  expect(picked.size).toBeGreaterThan(levels.length * 0.8);
});

test('a new level changes few days', () => {
  const before = year.map((day) => levels[dailyIndex(day, levels)]?.id);
  const more = [...levels, { ...levels[0], id: 'new-level' }];
  const after = year.map((day) => more[dailyIndex(day, more)]?.id);
  const changed = year.filter((_, i) => before[i] !== after[i]);
  // About one day in levels.length goes to the new level.
  expect(changed.length).toBeLessThan(365 / 20);
  for (const i of changed.map((day) => day - 1))
    expect(after[i]).toBe('new-level');
});
