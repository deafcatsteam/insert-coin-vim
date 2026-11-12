import { pressKey } from '../engine/replay';
import { createSession, type Session } from '../engine/session';
import { t } from '../i18n/i18n';
import type { Level } from '../levels/levels';
import { parseKeys } from '../scoring/keys';
import { stars } from '../scoring/stars';
import type { Attempt } from './game';
import { h } from './h';

/** Pause between two keys of the replayed solution. */
const REPLAY_STEP_MS = 500;

const clock = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};

/** Shows the results of an attempt in `root`. Returns the function that removes it. */
export function showResults(
  root: HTMLElement,
  level: Level,
  attempt: Attempt,
  actions: { retry: () => void; next?: () => void },
): () => void {
  const count = stars(attempt.keys.length, level);
  const optimal = level.solutions.reduce((a, b) =>
    parseKeys(b).length < parseKeys(a).length ? b : a,
  );
  const steps = parseKeys(optimal);

  const playedEl = h('pre', { className: 'ic-keys' });
  // The player watches this editor and cannot type in it.
  const replayEl = h('div', { className: 'ic-editor', inert: true });
  const watchEl = h('button', { type: 'button' }, t('results.watch'));
  const retryEl = h('button', { type: 'button' }, t('results.retry'));
  const nextEl = actions.next
    ? h('button', { type: 'button' }, t('results.next'))
    : h('p', {}, t('results.end'));
  root.replaceChildren(
    h('h1', {}, t('results.title')),
    h(
      'p',
      {
        className: 'ic-stars',
        // A screen reader says the label, not the star glyphs.
        role: 'img',
        ariaLabel: t('results.stars', { count }),
      },
      '★'.repeat(count) + '☆'.repeat(3 - count),
    ),
    h(
      'p',
      {},
      t('results.keys', { keys: attempt.keys.length, par: level.par }),
    ),
    h('p', {}, t('results.time', { time: clock(attempt.ms) })),
    h('h2', {}, t('results.yours')),
    h('pre', { className: 'ic-keys' }, attempt.keys.join('')),
    h('h2', {}, t('results.optimal', { count: steps.length })),
    h('pre', { className: 'ic-keys' }, optimal),
    h('p', {}, watchEl),
    replayEl,
    playedEl,
    h('p', {}, retryEl, ' ', nextEl),
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
  retryEl.addEventListener('click', actions.retry);
  if (actions.next) nextEl.addEventListener('click', actions.next);
  // Enter goes on, without the mouse.
  (actions.next ? nextEl : retryEl).focus();

  return stop;
}
