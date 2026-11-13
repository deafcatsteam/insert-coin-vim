import { dailyIndex, dailyNumber } from './daily/daily';
import { lang, t, type TextKey } from './i18n/i18n';
import { golfPack, levels, packs, shortest, type Level } from './levels/levels';
import { parseKeys } from './scoring/keys';
import {
  loadSave,
  recordGolf,
  recordInitials,
  recordResult,
  recordReview,
  recordRun,
  type LevelResult,
} from './progress/save';
import { gained, type Unlocks } from './progress/feats';
import { dueLevels } from './review/review';
import './style.css';
import { attract } from './ui/attract';
import { applyDisplay } from './ui/display';
import { helped, showGame, type Visit } from './ui/game';
import {
  showBoot,
  showCommunity,
  showGolf,
  showSelect,
  showTitle,
} from './ui/menu';
import { rating, showResults, showRun } from './ui/results';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('page markup missing: app');

const none = (): void => undefined;
/** An arrow key, with or without modifiers, in Vim notation. */
const ARROW = /^<(?:[CSAMD]-)*(?:Up|Down|Left|Right)>$/;

/** Runs `write`, then returns the themes and badges it unlocked. */
const unlocks = (write: () => void): Unlocks => {
  const before = loadSave();
  write();
  return gained(before, loadSave());
};
const newVisit = (): Visit => ({ resets: 0, idle: false, shown: false });
/** The levels of every community pack, in the order of their screen. */
const community = packs.flatMap((pack) => pack.levels);

/** The level on screen, or -1 in the menus. */
let index = -1;
/** Number of the daily challenge on screen, or undefined in the campaign. */
let day: number | undefined;
/** The level on screen comes from the review queue. */
let reviewing = false;
/** The level on screen is played in Free Golf (SPEC §5.4). */
let golfing = false;
/** The level on screen comes from a community pack: stars only, no review. */
let sharing = false;
/** The visit already updated the review queue. */
let remembered = false;
let visit = newVisit();
let close = none;
/**
 * The Speedrun on screen (SPEC §5.4). `start`: time of its first key.
 * `splits`: time from `start` to the end of each level done.
 */
let run: { chapter: number; start?: number; splits: number[] } | undefined;

const menu = (message?: string): void => {
  close();
  close = none;
  index = -1;
  run = undefined;
  showSelect(root, levels, start, title, message, startRun);
};

/** The Free Golf list: the levels done, with no help and no stars. */
const golfMenu = (): void => {
  close();
  close = none;
  index = -1;
  const done = loadSave().levels;
  // The expert pack opens with the last chapter of the campaign.
  const last = levels.at(-1)?.chapter;
  showGolf(
    root,
    levels,
    levels.every((l) => l.chapter !== last || l.id in done)
      ? golfPack
      : undefined,
    (to) => {
      start(to, undefined, false, true);
    },
    title,
  );
};

/** The community packs, each level with its stars. */
const communityMenu = (): void => {
  close();
  close = none;
  index = -1;
  showCommunity(
    root,
    packs,
    (to) => {
      start(to, undefined, false, false, true);
    },
    title,
  );
};

/** `today` is set for a daily challenge. It stays the same past midnight. */
const start = (
  to: number,
  today?: number,
  review = false,
  golf = false,
  shared = false,
): void => {
  index = to;
  day = today;
  reviewing = review;
  golfing = golf;
  sharing = shared;
  remembered = false;
  visit = newVisit();
  play();
};

/** Starts the Speedrun of a chapter again from its first level. */
const startRun = (chapter: number): void => {
  run = { chapter, splits: [] };
  start(levels.findIndex((level) => level.chapter === chapter));
};

/** A Speedrun gives no stars and no review: it chains the levels, then shows the time. */
const runDone = (level: Level, ms: number): void => {
  if (!run) return;
  // `done` comes DONE_DELAY_MS after each end, the first level included, so the
  // delay cancels out of every split.
  const now = performance.now();
  run.start ??= now - ms;
  run.splits.push(now - run.start);
  if (levels[index + 1]?.chapter === level.chapter) {
    start(index + 1);
    return;
  }
  const result = { ms: now - run.start, splits: run.splits };
  const { chapter } = run;
  let old;
  const unlocked = unlocks(() => (old = recordRun(chapter, result)));
  showRun(
    root,
    levels.filter((l) => l.chapter === chapter),
    result,
    old,
    {
      retry: reset,
      menu: () => menu(),
      sign: (initials) => {
        recordInitials(chapter, initials);
      },
    },
    unlocked,
  );
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
  // Free Golf indexes the campaign, then the expert pack.
  const level = golfing
    ? [...levels, ...golfPack][index]
    : sharing
      ? community[index]
      : levels[index];
  if (!level) {
    menu();
    return;
  }
  close = showGame(
    root,
    level,
    visit,
    {
      done: (attempt) => {
        close();
        if (run) {
          close = none;
          runDone(level, attempt.ms);
          return;
        }
        // Free Golf keeps its own record: no stars, no review.
        if (golfing) {
          let old;
          const unlocked = unlocks(
            () => (old = recordGolf(level.id, attempt.keys.length)),
          );
          close = showResults(
            root,
            level,
            attempt,
            { retry: play, menu: golfMenu },
            undefined,
            false,
            unlocked,
            { old },
          );
          return;
        }
        const stars = rating(attempt, level);
        // A community level keeps its stars only: badges and review read the campaign.
        if (sharing) {
          recordResult(level.id, { stars, keys: attempt.keys.length });
          close = showResults(root, level, attempt, {
            retry: play,
            next: nextShared(level),
            menu: communityMenu,
          });
          return;
        }
        const result: LevelResult = { stars, keys: attempt.keys.length };
        if (!helped(visit)) result.noHints = true;
        if (!attempt.keys.some((key) => ARROW.test(key)))
          result.noArrows = true;
        // A daily challenge is saved as a campaign result of the same level.
        const unlocked = unlocks(() => recordResult(level.id, result));
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
          // The last level of a chapter in the campaign (SPEC §11).
          day === undefined &&
            !reviewing &&
            levels[index + 1]?.chapter !== level.chapter,
          unlocked,
        );
      },
      reset,
      skip: () => {
        if (sharing) {
          (nextShared(level) ?? communityMenu)();
          return;
        }
        remember(level, true);
        // Skipping the daily challenge leads to the level list.
        if (reviewing) review();
        else if (day === undefined) start(index + 1);
        else menu();
      },
      menu: () => {
        if (golfing) golfMenu();
        else if (sharing) communityMenu();
        else menu();
      },
    },
    run !== undefined || golfing,
    golfing
      ? t('golf.toBeat', {
          count:
            loadSave().golf?.[level.id] ?? parseKeys(shortest(level)).length,
        })
      : '',
  );
};

/** Plays the next level of the same pack, or undefined after its last level. */
const nextShared = (level: Level): (() => void) | undefined => {
  const next = community[index + 1];
  return next &&
    packs.some((p) => p.levels.includes(level) && p.levels.includes(next))
    ? () => {
        start(index + 1, undefined, false, false, true);
      }
    : undefined;
};

// shortcut: every reset counts as a failed attempt for the hints, even with no
// key typed; count typed attempts only if hints show up too early in play tests.
// In a Speedrun, a reset starts the whole run again.
const reset = (): void => {
  if (run) {
    close();
    close = none;
    startRun(run.chapter);
    return;
  }
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
document.documentElement.lang = lang;
for (const el of document.querySelectorAll<HTMLElement>('[data-t]'))
  el.textContent = t(el.dataset.t as TextKey);

applyDisplay();
const title = (): void => {
  close();
  showTitle(
    root,
    () => {
      menu();
    },
    daily,
    review,
    reviewQueue().length,
    // Free Golf lists campaign levels: a community level alone does not open it.
    levels.some((l) => l.id in loadSave().levels) ? golfMenu : undefined,
    packs.length > 0 ? communityMenu : undefined,
  );
  // Every screen that replaces the title calls `close` first.
  close = attract(root, levels, title);
};
// The shared link of a daily challenge opens it at once.
if (location.hash === '#daily') daily();
// No boot animation for players who ask for less motion (SPEC §8.5).
else if (matchMedia('(prefers-reduced-motion: reduce)').matches) title();
else showBoot(root, title);
