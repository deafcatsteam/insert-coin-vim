import { getCM } from '@replit/codemirror-vim';
import { diffHighlight, diffSpan } from '../engine/diff';
import { createSession } from '../engine/session';
import { t, type TextKey } from '../i18n/i18n';
import type { Level } from '../levels/levels';
import { h } from './h';

export interface Attempt {
  keys: readonly string[];
  faults: number;
  /** From the first key to the completion. */
  ms: number;
}

/** Time the player sees the finished buffer before the results replace it. */
const DONE_DELAY_MS = 600;

/** Shows one attempt at a level in `root`. Returns the function that removes it. */
export function showGame(
  root: HTMLElement,
  level: Level,
  onDone: (attempt: Attempt) => void,
  onReset: () => void,
): () => void {
  const editorEl = h('div', { className: 'ic-editor' });
  const targetEl = h('pre', { className: 'ic-target' });
  const modeEl = h('strong', {}, t('mode.normal'));
  const keysEl = h('span');
  const faultsEl = h('span');
  const deniedEl = h('p', { className: 'ic-denied', role: 'status' });
  const resetEl = h('button', { type: 'button' }, t('game.reset'));
  root.replaceChildren(
    h('h1', {}, t(level.title.key as TextKey)),
    h('h2', {}, t('game.buffer')),
    editorEl,
    h('p', {}, modeEl, ' ', keysEl, ' ', faultsEl, ' ', resetEl),
    deniedEl,
    h('h2', {}, t('game.target')),
    targetEl,
  );

  let startedAt: number | undefined;
  let faults = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const show = (): void => {
    const { from, toB } = diffSpan(
      session.view.state.doc.toString(),
      level.target,
    );
    targetEl.replaceChildren(
      level.target.slice(0, from),
      h('mark', {}, level.target.slice(from, toB)),
      level.target.slice(toB),
    );
    keysEl.textContent = t('game.keys', { count: session.keys.length });
    faultsEl.textContent = t('game.faults', { count: session.faults });
    // The message stays until the next key.
    deniedEl.textContent = session.faults > faults ? t('game.denied') : '';
    faults = session.faults;

    if (session.keys.length > 0) startedAt ??= performance.now();
    if (!session.done || timer !== undefined) return;
    const attempt: Attempt = {
      keys: [...session.keys],
      faults: session.faults,
      ms: performance.now() - (startedAt ?? performance.now()),
    };
    // Not now: this runs inside an editor update, and the results remove the editor.
    timer = setTimeout(() => {
      onDone(attempt);
    }, DONE_DELAY_MS);
  };

  const session = createSession(
    editorEl,
    level,
    show,
    diffHighlight(level.target),
  );
  getCM(session.view)?.on('vim-mode-change', (e: { mode: string }) => {
    modeEl.textContent = t(`mode.${e.mode}` as TextKey);
  });
  resetEl.addEventListener('click', onReset);
  show();
  session.view.focus();

  return () => {
    clearTimeout(timer);
    session.destroy();
  };
}
