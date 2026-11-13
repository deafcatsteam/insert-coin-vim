import { t } from '../i18n/i18n';
import { themes, THEMES, type Theme } from '../progress/feats';
import { loadSave } from '../progress/save';
import { h } from './h';

/** The screen effects of SPEC §8.5. Each one is the class `fx-<name>` on <html>. */
const EFFECTS = ['scanlines', 'glow', 'curve', 'flicker'] as const;
const STORE = 'insert-coin-display';
/** The chosen screen theme (SPEC §5.6), or 'amber', the default. */
const THEME_STORE = 'insert-coin-theme';

const loadTheme = (): string => {
  try {
    return localStorage.getItem(THEME_STORE) ?? 'amber';
  } catch {
    return 'amber';
  }
};

/** The themes the save unlocks now. */
export const unlockedThemes = (): Theme[] => themes(loadSave());

const store = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: the setting lasts until the page closes.
  }
};

/** The effects the player turned off. All are on when nothing is stored. */
const loadOff = (): Set<string> => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return new Set();
  }
};

/** Puts the stored display settings on the page. */
export function applyDisplay(): void {
  const off = loadOff();
  for (const effect of EFFECTS)
    document.documentElement.classList.toggle(`fx-${effect}`, !off.has(effect));
  // A theme stored on a device whose save lacks it stays off.
  const theme = loadTheme();
  const on = unlockedThemes().find((name) => name === theme);
  for (const name of THEMES)
    document.documentElement.classList.toggle(`theme-${name}`, name === on);
}

/** The display settings: one checkbox per effect, and the theme list once a theme is unlocked. */
export function displaySettings(): HTMLElement {
  const off = loadOff();
  const unlocked = unlockedThemes();
  const current = loadTheme();
  const theme = h(
    'select',
    {},
    ...['amber', ...unlocked].map((name) =>
      h(
        'option',
        { value: name, selected: name === current },
        t(`display.${name as Theme | 'amber'}`),
      ),
    ),
  );
  theme.addEventListener('change', () => {
    store(THEME_STORE, theme.value);
    applyDisplay();
  });
  return h(
    'fieldset',
    {},
    h('legend', {}, t('display.title')),
    ...EFFECTS.map((effect) => {
      const box = h('input', { type: 'checkbox', checked: !off.has(effect) });
      box.addEventListener('change', () => {
        if (box.checked) off.delete(effect);
        else off.add(effect);
        store(STORE, JSON.stringify([...off]));
        applyDisplay();
      });
      return h('label', {}, box, ' ', t(`display.${effect}`));
    }),
    unlocked.length > 0 ? h('label', {}, t('display.theme'), ' ', theme) : '',
  );
}
