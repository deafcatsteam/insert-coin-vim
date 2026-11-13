import { t } from '../i18n/i18n';
import { levels } from '../levels/levels';
import { loadSave } from '../progress/save';
import { h } from './h';

/** The screen effects of SPEC §8.5. Each one is the class `fx-<name>` on <html>. */
const EFFECTS = ['scanlines', 'glow', 'curve', 'flicker'] as const;
const STORE = 'insert-coin-display';
/** The LCD olive theme: a reward for finishing the campaign. */
const THEME_STORE = 'insert-coin-theme';

/** True once every level of the campaign has a result. */
export const campaignCleared = (): boolean => {
  const done = loadSave().levels;
  return levels.every((level) => level.id in done);
};

const loadOlive = (): boolean => {
  try {
    return localStorage.getItem(THEME_STORE) === 'olive';
  } catch {
    return false;
  }
};

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
  document.documentElement.classList.toggle(
    'theme-olive',
    loadOlive() && campaignCleared(),
  );
}

/** The display settings: one checkbox per effect, and the theme once unlocked. */
export function displaySettings(): HTMLElement {
  const off = loadOff();
  const olive = h('input', { type: 'checkbox', checked: loadOlive() });
  olive.addEventListener('change', () => {
    store(THEME_STORE, olive.checked ? 'olive' : 'amber');
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
    campaignCleared() ? h('label', {}, olive, ' ', t('display.olive')) : '',
  );
}
