import { describe, expect, test } from 'vitest';
import en from '../../locales/en.json';
import { locales, match, t, type TextKey } from './i18n';

test('returns the text of a key', () => {
  expect(t('levels.c03-l01.title')).toBe('Delete a word');
});

test('shows the key itself when the text is missing', () => {
  expect(t('missing.key' as TextKey)).toBe('missing.key');
});

test('matches a browser tag to a locale', () => {
  expect(match('en-US')).toBe('en');
  expect(match('xx')).toBeUndefined();
});

const holes = (text: string): string[] =>
  [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();

describe.each(Object.keys(locales))('locale %s', (code) => {
  const texts = locales[code] ?? {};

  test('has the same keys as en', () => {
    expect(Object.keys(texts).sort()).toEqual(Object.keys(en).sort());
  });

  test('keeps the {variables} of en and no text is empty', () => {
    for (const [key, text] of Object.entries(en)) {
      const own = texts[key] ?? '';
      expect(own.trim(), `${code} ${key}`).not.toBe('');
      expect(holes(own), `${code} ${key}`).toEqual(holes(text));
    }
  });
});
