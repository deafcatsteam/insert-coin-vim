import { dailyIndex, dailyNumber } from './daily/daily';
import { t, type TextKey } from './i18n/i18n';
import { levels, type Level } from './levels/levels';
import { loadSave, recordResult, recordReview } from './progress/save';
import { dueLevels } from './review/review';
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
/** Number of the daily challenge on screen, or undefined in the campaign. */
let day: number | undefined;
/** The level on screen comes from the review queue. */
let reviewing = false;
/** The visit already updated the review queue. */
let remembered = false;
let visit = newVisit();
let close = none;

const menu = (message?: string): void => {
  close();
  close = none;
  index = -1;
  showSelect(root, levels, start, title, message);
};

/** `today` is set for a daily challenge. It stays the same past midnight. */
const start = (to: number, today?: number, review = false): void => {
  index = to;
  day = today;
  reviewing = review;
  remembered = false;
  visit = newVisit();
  play();
};

const daily = (): void => {
  const today = dailyNumber(new Date());
  start(dailyIndex(today, levels), today);
};

/** Each level played leaves the queue of the day, so the queue is read again each time. */
const reviewQueue = (): number[] =>
  dueLevels(loadSave(), levels, dailyNumber(new Date()));

const review = (): void => {
  const next = reviewQueue()[0];
  if (next === undefined) menu(t('review.empty'));
  else start(next, undefined, true);
};

/**
 * Skipped, or one star: the concepts of the level come back the next day.
 * Only the first end of a visit counts, so a retry for fun cannot undo a pass.
 */
const remember = (level: Level, weak: boolean): void => {
  if (remembered) return;
  remembered = true;
  recordReview(level.concepts, weak, dailyNumber(new Date()));
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
      const stars = rating(attempt, level);
      // A daily challenge is saved as a campaign result of the same level.
      recordResult(level.id, { stars, keys: attempt.keys.length });
      remember(level, stars <= 1);
      // At the end of the queue, review() shows the level list and says so.
      const next = reviewing
        ? review
        : day === undefined && levels[index + 1]
          ? () => {
              start(index + 1);
            }
          : undefined;
      close = showResults(
        root,
        level,
        attempt,
        { retry: play, next, menu: () => menu() },
        day,
      );
    },
    reset,
    skip: () => {
      remember(level, true);
      // Skipping the daily challenge leads to the level list.
      if (reviewing) review();
      else if (day === undefined) start(index + 1);
      else menu();
    },
    menu: () => menu(),
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
  showTitle(
    root,
    () => {
      menu();
    },
    daily,
    review,
    reviewQueue().length,
  );
};
// The shared link of a daily challenge opens it at once.
if (location.hash === '#daily') daily();
// No boot animation for players who ask for less motion (SPEC §8.5).
else if (matchMedia('(prefers-reduced-motion: reduce)').matches) title();
else showBoot(root, title);
