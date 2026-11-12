import { t } from '../i18n/i18n';
import { h } from './h';

/** The screen effects of SPEC §8.5. Each one is the class `fx-<name>` on <html>. */
const EFFECTS = ['scanlines', 'glow', 'curve', 'flicker'] as const;
const STORE = 'insert-coin-display';

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
}

/** The display settings: one checkbox per effect. */
export function displaySettings(): HTMLElement {
  const off = loadOff();
  return h(
    'fieldset',
    {},
    h('legend', {}, t('display.title')),
    ...EFFECTS.map((effect) => {
      const box = h('input', { type: 'checkbox', checked: !off.has(effect) });
      box.addEventListener('change', () => {
        if (box.checked) off.delete(effect);
        else off.add(effect);
        try {
          localStorage.setItem(STORE, JSON.stringify([...off]));
        } catch {
          // Storage blocked or full: the setting lasts until the page closes.
        }
        applyDisplay();
      });
      return h('label', {}, box, ' ', t(`display.${effect}`));
    }),
  );
}
