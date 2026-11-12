import { expect, test } from 'vitest';
import en from '../../locales/en.json';
import { t, type TextKey } from './i18n';

test('returns the text of a key', () => {
  expect(t('levels.c03-l01.title')).toBe('Delete a word');
});

test('shows the key itself when the text is missing', () => {
  expect(t('missing.key' as TextKey)).toBe('missing.key');
});

test('no text is empty', () => {
  for (const [key, text] of Object.entries(en))
    expect(text.trim(), key).not.toBe('');
});
