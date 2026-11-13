import { pressKey } from '../engine/replay';
import { createSession, type Session } from '../engine/session';
import { t, type TextKey } from '../i18n/i18n';
import { shortest, type Level } from '../levels/levels';
import type { Theme } from '../progress/feats';
import { isInitials, loadSave, type Run } from '../progress/save';
import { parseKeys } from '../scoring/keys';
import { stars } from '../scoring/stars';
import type { Attempt } from './game';
import { h, starRow, starText, strip, support } from './h';

/** Pause between two keys of the replayed solution. */
const REPLAY_STEP_MS = 500;

/** `mm:ss`, or `mm:ss.t` with `tenths` for Speedruns. */
export const clock = (ms: number, tenths = false): string => {
  const tens = Math.round(ms / 100);
  const seconds = tenths ? Math.floor(tens / 10) : Math.round(ms / 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const time = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  return tenths ? `${time}.${tens % 10}` : time;
};

/** One line per theme just unlocked. */
const unlockedText = (unlocked: readonly Theme[]): HTMLElement[] =>
  unlocked.map((theme) =>
    h('p', {}, t('results.unlocked', { name: t(`display.${theme}`) })),
  );

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
 * `unlocked`: the themes this attempt unlocked, now in the display settings.
 * `golf` is set in Free Golf: keys against the record before (`old`), no stars, no share.
 */
export function showResults(
  root: HTMLElement,
  level: Level,
  attempt: Attempt,
  actions: { retry: () => void; next?: () => void; menu: () => void },
  day?: number,
  chapterEnd = false,
  unlocked: readonly Theme[] = [],
  golf?: { old: number | undefined },
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
    : h('span', {}, day || golf ? '' : t('results.end'));
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
          ...(golf
            ? [
                h('p', {}, t('game.keys', { count: attempt.keys.length })),
                golf.old === undefined || attempt.keys.length < golf.old
                  ? h('p', { className: 'ic-stamp' }, t('run.record'))
                  : h('p', {}, t('golf.best', { keys: golf.old })),
              ]
            : [
                h(
                  'p',
                  { className: 'ic-stars' },
                  starRow(rating(attempt, level)),
                ),
                h(
                  'p',
                  {},
                  t('results.keys', {
                    keys: attempt.keys.length,
                    par: level.par,
                  }),
                ),
              ]),
          h('p', {}, t('results.time', { time: clock(attempt.ms) })),
          // The reference is the shortest solution known, not a proven minimum.
          !attempt.shown && attempt.keys.length < steps.length
            ? h('p', {}, t('results.beatBest'))
            : '',
          ...unlockedText(unlocked),
          ...(golf
            ? []
            : [
                h('p', { className: 'ic-stamp' }, t('results.stamp')),
                h('p', {}, copyEl),
                sharedEl,
                copyStatusEl,
              ]),
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

/** `+1.2`, `−0.4` or `±0.0` seconds against the record. */
const gap = (ms: number): string => {
  const tenths = Math.round(ms / 100);
  const sign = tenths < 0 ? '−' : tenths > 0 ? '+' : '±';
  return `${sign}${(Math.abs(tenths) / 10).toFixed(1)}`;
};

/**
 * Shows the end of a Speedrun in `root`: the time, and each split against `old`,
 * the record before this run. `levels`: the levels of the run, in order.
 * A new record asks for arcade initials and gives them to `actions.sign`.
 * `unlocked`: the themes this run unlocked.
 */
export function showRun(
  root: HTMLElement,
  levels: readonly Level[],
  run: Run,
  old: Run | undefined,
  actions: {
    retry: () => void;
    menu: () => void;
    sign: (initials: string) => void;
  },
  unlocked: readonly Theme[] = [],
): void {
  const retryEl = h('button', { type: 'button' }, t('results.retry'));
  const menuEl = h('button', { type: 'button' }, t('nav.levels'));
  const record = !old || run.ms < old.ms;
  // The initials of an earlier record, so a returning player only presses Enter.
  const initialsEl = h('input', {
    size: 3,
    maxLength: 3,
    autocomplete: 'off',
    spellcheck: false,
    value:
      Object.values(loadSave().speedrun ?? {}).find((r) => r.initials)
        ?.initials ?? '',
  });
  const signedEl = h('p', { role: 'status' });
  const signEl = h(
    'form',
    { className: 'ic-sign' },
    h('label', {}, t('run.initials'), ' ', initialsEl),
    ' ',
    h('button', { type: 'submit' }, t('run.sign')),
    signedEl,
  );
  root.replaceChildren(
    h(
      'div',
      { className: 'ic-results' },
      strip(),
      h(
        'header',
        { className: 'ic-head' },
        h('h1', {}, t('run.title', { chapter: levels[0]?.chapter ?? 0 })),
      ),
      h(
        'section',
        { className: 'ic-panel' },
        h('p', {}, t('results.time', { time: clock(run.ms, true) })),
        record
          ? h('p', { className: 'ic-stamp' }, t('run.record'))
          : h('p', {}, t('run.best', { time: clock(old.ms, true) })),
        record ? signEl : '',
        ...unlockedText(unlocked),
        h('h2', {}, t('run.splits')),
        h(
          'ol',
          {},
          ...levels.map((level, i) => {
            const split = run.splits[i] ?? 0;
            const before = old?.splits[i];
            return h(
              'li',
              {},
              `${t(level.title.key as TextKey)} ${clock(split, true)}`,
              before === undefined ? '' : ` ${gap(split - before)}`,
            );
          }),
        ),
      ),
      h('p', {}, retryEl, ' ', menuEl),
    ),
  );
  retryEl.addEventListener('click', actions.retry);
  menuEl.addEventListener('click', actions.menu);
  // Letters only, upper case, as on an arcade cabinet.
  initialsEl.addEventListener('input', () => {
    initialsEl.value = initialsEl.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3);
  });
  signEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const initials = initialsEl.value;
    if (!isInitials(initials)) {
      signedEl.textContent = t('run.initialsBad');
      return;
    }
    actions.sign(initials);
    signedEl.textContent = t('run.signed', { initials });
    retryEl.focus({ preventScroll: true });
  });
  if (record) {
    initialsEl.focus({ preventScroll: true });
    initialsEl.select();
  } else retryEl.focus({ preventScroll: true });
}
