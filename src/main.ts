import { t, type TextKey } from './i18n/i18n';
import { levels } from './levels/levels';
import { recordResult } from './progress/save';
import './style.css';
import { applyDisplay } from './ui/display';
import { showGame, type Visit } from './ui/game';
import { showBoot, showSelect, showTitle } from './ui/menu';
import { rating, showResults } from './ui/results';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('page markup missing: app');

const none = (): void => undefined;
const newVisit = (): Visit => ({ resets: 0, idle: false, shown: false });

/** The level on screen, or -1 in the menus. */
let index = -1;
let visit = newVisit();
let close = none;

const menu = (): void => {
  close();
  close = none;
  index = -1;
  showSelect(root, levels, start);
};

const start = (to: number): void => {
  index = to;
  visit = newVisit();
  play();
};

/** Starts the current level again from its start buffer. */
const play = (): void => {
  close();
  const level = levels[index];
  if (!level) {
    menu();
    return;
  }
  close = showGame(root, level, visit, {
    done: (attempt) => {
      close();
      recordResult(level.id, {
        stars: rating(attempt, level),
        keys: attempt.keys.length,
      });
      close = showResults(root, level, attempt, {
        retry: play,
        next: levels[index + 1]
          ? () => {
              start(index + 1);
            }
          : undefined,
        menu,
      });
    },
    reset,
    skip: () => {
      start(index + 1);
    },
    menu,
  });
};

// shortcut: every reset counts as a failed attempt for the hints, even with no
// key typed; count typed attempts only if hints show up too early in play tests.
const reset = (): void => {
  visit.resets++;
  play();
};

// The reset shortcut (SPEC §5.3). F2 means nothing to Vim or to the browsers.
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'F2' || index < 0) return;
    e.preventDefault();
    e.stopPropagation();
    reset();
  },
  true,
);

// The casing texts of index.html come from the locale file too.
for (const el of document.querySelectorAll<HTMLElement>('[data-t]'))
  el.textContent = t(el.dataset.t as TextKey);

applyDisplay();
const title = (): void => {
  showTitle(root, menu);
};
// No boot animation for players who ask for less motion (SPEC §8.5).
if (matchMedia('(prefers-reduced-motion: reduce)').matches) title();
else showBoot(root, title);
