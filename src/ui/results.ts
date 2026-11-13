import { pressKey } from '../engine/replay';
import { createSession, type Session } from '../engine/session';
import { t } from '../i18n/i18n';
import { shortest, type Level } from '../levels/levels';
import { parseKeys } from '../scoring/keys';
import { stars } from '../scoring/stars';
import type { Attempt } from './game';
import { h, starRow, starText, strip, support } from './h';

/** Pause between two keys of the replayed solution. */
const REPLAY_STEP_MS = 500;

const clock = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};

/** Stars of an attempt. A shown solution gives one star at most (SPEC §5.3). */
export const rating = (attempt: Attempt, level: Level): 1 | 2 | 3 =>
  attempt.shown ? 1 : stars(attempt.keys.length, level);

/** The site the shared text links to. An itch.io copy links here too. */
export const SITE_URL = 'https://deafcatsteam.github.io/insert-coin-vim/';

/** Text to paste anywhere (SPEC §5.5). It tells the score, not the keys. */
export const shareText = (
  level: Level,
  attempt: Attempt,
  day?: number,
): string => {
  const head = day
    ? t('share.daily', { day: String(day).padStart(3, '0') })
    : t('share.level', { id: level.id });
  return [
    `${head} ${starText(rating(attempt, level))}`,
    t('share.score', {
      keys: attempt.keys.length,
      par: level.par,
      time: clock(attempt.ms),
    }),
    day ? `${SITE_URL}#daily` : SITE_URL,
  ].join('\n');
};

/**
 * Shows the results of an attempt in `root`. Returns the function that removes it.
 * `day` is set for a daily challenge. `chapterEnd` adds the support links.
 * `unlocked` tells the player that the LCD olive theme is now in the settings.
 */
export function showResults(
  root: HTMLElement,
  level: Level,
  attempt: Attempt,
  actions: { retry: () => void; next?: () => void; menu: () => void },
  day?: number,
  chapterEnd = false,
  unlocked = false,
): () => void {
  const optimal = shortest(level);
  const steps = parseKeys(optimal);

  const playedEl = h('pre', { className: 'ic-keys' });
  // The player watches this editor and cannot type in it.
  const replayEl = h('div', { className: 'ic-editor', inert: true });
  const watchEl = h('button', { type: 'button' }, t('results.watch'));
  const copyEl = h('button', { type: 'button' }, t('results.copy'));
  // Shown when the browser refuses the clipboard, to copy by hand.
  const sharedEl = h('textarea', {
    className: 'ic-keys',
    readOnly: true,
    hidden: true,
    rows: 3,
    value: shareText(level, attempt, day),
  });
  const copyStatusEl = h('p', { role: 'status' });
  const retryEl = h('button', { type: 'button' }, t('results.retry'));
  // A daily challenge has no next level.
  const nextEl = actions.next
    ? h('button', { type: 'button' }, t('results.next'))
    : h('span', {}, day ? '' : t('results.end'));
  const menuEl = h('button', { type: 'button' }, t('nav.levels'));
  root.replaceChildren(
    h(
      'div',
      { className: 'ic-results' },
      strip(),
      h(
        'header',
        { className: 'ic-head' },
        h('h1', {}, t('results.title')),
        h('span', { className: 'ic-tab' }, level.id),
      ),
      h(
        'div',
        { className: 'ic-panes' },
        h(
          'section',
          { className: 'ic-panel' },
          h('h2', {}, t('results.score')),
          h('p', { className: 'ic-stars' }, starRow(rating(attempt, level))),
          h(
            'p',
            {},
            t('results.keys', { keys: attempt.keys.length, par: level.par }),
          ),
          h('p', {}, t('results.time', { time: clock(attempt.ms) })),
          // The reference is the shortest solution known, not a proven minimum.
          !attempt.shown && attempt.keys.length < steps.length
            ? h('p', {}, t('results.beatBest'))
            : '',
          unlocked ? h('p', {}, t('results.unlocked')) : '',
          h('p', { className: 'ic-stamp' }, t('results.stamp')),
          h('p', {}, copyEl),
          sharedEl,
          copyStatusEl,
        ),
        h(
          'section',
          { className: 'ic-panel' },
          h('h2', {}, t('results.yours')),
          h('pre', { className: 'ic-keys' }, attempt.keys.join('')),
        ),
        h(
          'section',
          { className: 'ic-panel' },
          h('h2', {}, t('results.optimal', { count: steps.length })),
          h('pre', { className: 'ic-keys' }, optimal),
          h('p', {}, watchEl),
          replayEl,
          playedEl,
        ),
      ),
      h('p', {}, retryEl, ' ', nextEl, ' ', menuEl),
      chapterEnd ? support() : '',
    ),
  );

  let replay: Session | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = (): void => {
    clearInterval(timer);
    replay?.destroy();
    replay = undefined;
  };
  watchEl.addEventListener('click', () => {
    stop();
    const session = (replay = createSession(replayEl, level));
    let step = 0;
    playedEl.textContent = '';
    timer = setInterval(() => {
      const key = steps[step++];
      if (key === undefined) {
        clearInterval(timer);
        return;
      }
      pressKey(session.view, key);
      playedEl.textContent += key;
    }, REPLAY_STEP_MS);
  });
  copyEl.addEventListener('click', () => {
    // A missing clipboard (old browser, iframe without permission) throws here too.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(sharedEl.value))
      .then(
        () => {
          copyStatusEl.textContent = t('results.copied');
        },
        () => {
          sharedEl.hidden = false;
          sharedEl.select();
          copyStatusEl.textContent = t('results.copyManual');
        },
      );
  });
  retryEl.addEventListener('click', actions.retry);
  menuEl.addEventListener('click', actions.menu);
  if (actions.next) nextEl.addEventListener('click', actions.next);
  // Enter goes on, without the mouse. No scroll: the title stays in view.
  (actions.next ? nextEl : menuEl).focus({ preventScroll: true });

  return stop;
}
