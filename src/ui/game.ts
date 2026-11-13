import { getCM, Vim } from '@replit/codemirror-vim';
import { diffHighlight, diffSpan } from '../engine/diff';
import { createSession } from '../engine/session';
import { t, type TextKey } from '../i18n/i18n';
import { shortest, type Level } from '../levels/levels';
import { h } from './h';
import { beep } from './sound';

export interface Attempt {
  keys: readonly string[];
  faults: number;
  /** From the first key to the completion. */
  ms: number;
  /** The player looked at the solution before completing. */
  shown: boolean;
}

/** What the player did on a level since they opened it. Lives across resets. */
export interface Visit {
  resets: number;
  /** The player stayed 60 s without a key. */
  idle: boolean;
  /** The player asked for the solution. */
  shown: boolean;
}

export interface GameActions {
  done: (attempt: Attempt) => void;
  reset: () => void;
  skip: () => void;
  menu: () => void;
}

/** Time the player sees the finished buffer before the results replace it. */
const DONE_DELAY_MS = 600;
/** Resets that reveal hint 1 and hint 2; the second also offers the solution (SPEC §5.3). */
const HINT_RESETS = [2, 4] as const;
const IDLE_MS = 60_000;

/** True once the visit showed a hint or the solution. */
export const helped = (visit: Visit): boolean =>
  visit.shown || visit.idle || visit.resets >= HINT_RESETS[0];

/**
 * Shows one attempt at a level in `root`. Returns the function that removes it.
 * `bare`: a Speedrun or Free Golf level, with no hints, no solution and no skip
 * (SPEC §5.4). `goal`: a line under the brief, the golf record to beat.
 */
export function showGame(
  root: HTMLElement,
  level: Level,
  visit: Visit,
  actions: GameActions,
  bare = false,
  goal = '',
): () => void {
  const editorEl = h('div', { className: 'ic-editor' });
  const targetEl = h('pre', { className: 'ic-target' });
  const modeEl = h('strong', {}, t('mode.normal'));
  // Vim shows nothing else while it records, and a stray q starts a recording.
  const recEl = h('strong', { className: 'ic-rec', hidden: true });
  const keysEl = h('span');
  const faultsEl = h('span');
  const deniedEl = h('p', { className: 'ic-denied', role: 'status' });
  const helpEl = h('div', { role: 'status' });
  const button = (key: TextKey, action: () => void): HTMLButtonElement => {
    const el = h('button', { type: 'button' }, t(key));
    el.addEventListener('click', action);
    return el;
  };
  const solutionEl = button('game.solution', () => {
    visit.shown = true;
    showHelp();
    session.view.focus();
  });
  root.replaceChildren(
    h(
      'div',
      { className: 'ic-game' },
      h(
        'header',
        { className: 'ic-head' },
        h('h1', {}, t(level.title.key as TextKey)),
        h('span', { className: 'ic-tab' }, level.id),
      ),
      h(
        'p',
        { className: 'ic-brief' },
        level.brief ? t(level.brief.key as TextKey) : '',
      ),
      goal ? h('p', { className: 'ic-brief' }, goal) : '',
      h(
        'div',
        { className: 'ic-panes' },
        h(
          'section',
          { className: 'ic-panel' },
          h('h2', {}, t('game.buffer')),
          editorEl,
          h(
            'p',
            { className: 'ic-status' },
            modeEl,
            ' ',
            recEl,
            ' ',
            keysEl,
            ' ',
            faultsEl,
          ),
          deniedEl,
        ),
        h(
          'section',
          { className: 'ic-panel' },
          h('h2', {}, t('game.target')),
          targetEl,
        ),
      ),
      helpEl,
      h(
        'p',
        { className: 'ic-actions' },
        button('game.reset', actions.reset),
        ' ',
        ...(bare
          ? []
          : [solutionEl, ' ', button('game.skip', actions.skip), ' ']),
        button('nav.levels', actions.menu),
      ),
    ),
  );

  let startedAt: number | undefined;
  let faults = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const showHelp = (): void => {
    if (bare) return;
    const count =
      HINT_RESETS.filter((n) => visit.resets >= n).length || Number(visit.idle);
    helpEl.replaceChildren(
      ...level.hints
        .slice(0, count)
        .map((hint, i) =>
          h(
            'p',
            {},
            t('game.hint', { n: i + 1, text: t(hint.key as TextKey) }),
          ),
        ),
      ...(visit.shown
        ? [h('p', {}, t('game.solutionKeys', { keys: shortest(level) }))]
        : []),
    );
    solutionEl.hidden = visit.shown || visit.resets < HINT_RESETS[1];
  };

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
    if (session.faults > faults) beep('denied');
    faults = session.faults;
    // `show` runs before Vim handles the key; read the recording once it has.
    queueMicrotask(() => {
      const macro = Vim.getVimGlobalState_().macroModeState;
      recEl.hidden = !macro.isRecording;
      recEl.textContent = t('mode.recording', {
        register: macro.latestRegister ?? '',
      });
    });

    clearTimeout(idleTimer);
    if (!session.done)
      idleTimer = setTimeout(() => {
        visit.idle = true;
        showHelp();
      }, IDLE_MS);

    if (session.keys.length > 0) startedAt ??= performance.now();
    if (!session.done || timer !== undefined) return;
    const attempt: Attempt = {
      keys: [...session.keys],
      faults: session.faults,
      ms: performance.now() - (startedAt ?? performance.now()),
      shown: visit.shown,
    };
    beep('done');
    // Not now: this runs inside an editor update, and the results remove the editor.
    timer = setTimeout(() => {
      actions.done(attempt);
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
  show();
  showHelp();
  session.view.focus();

  return () => {
    clearTimeout(timer);
    clearTimeout(idleTimer);
    session.destroy();
  };
}
