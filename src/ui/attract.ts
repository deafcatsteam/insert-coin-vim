import { pressKey } from '../engine/replay';
import { createSession, type Session } from '../engine/session';
import { t, type TextKey } from '../i18n/i18n';
import { shortest, type Level } from '../levels/levels';
import { parseKeys } from '../scoring/keys';
import { h } from './h';

/** Time with no input on the title screen before the demo starts. */
export const ATTRACT_IDLE_MS = 30_000;
/** Pause between two keys of the demo. */
const STEP_MS = 400;
/** Time the finished buffer stays before the title comes back. */
const END_MS = 2_000;
/** Input that keeps the title screen awake. Only a key or a click ends the demo. */
const INPUTS = ['keydown', 'pointerdown', 'pointermove', 'wheel'] as const;

/**
 * Attract mode (SPEC §5.6): after ATTRACT_IDLE_MS with no input on the title
 * screen, shows in `root` the shortest solution of one of `levels`, then calls
 * `back`. Any key or click calls `back` sooner. Off for players who ask for less
 * motion. Returns the function that stops it; call it when the title goes away.
 */
export function attract(
  root: HTMLElement,
  levels: readonly Level[],
  back: () => void,
): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches)
    return () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let session: Session | undefined;

  const stop = (): void => {
    clearTimeout(timer);
    session?.destroy();
    session = undefined;
    for (const type of INPUTS) window.removeEventListener(type, onInput, true);
  };
  const end = (): void => {
    stop();
    back();
  };
  const arm = (): void => {
    clearTimeout(timer);
    timer = setTimeout(play, ATTRACT_IDLE_MS);
  };

  function onInput(e: Event): void {
    if (!session) {
      arm();
      return;
    }
    // The demo types into its own editor through keydown too.
    if (e.target instanceof Node && session.view.dom.contains(e.target)) return;
    if (e.type !== 'keydown' && e.type !== 'pointerdown') return;
    // The key that ends the demo must not also press a button of the title.
    e.preventDefault();
    end();
  }

  function play(): void {
    // A file dialog or another tab is open: the player is still here.
    if (!document.hasFocus()) {
      arm();
      return;
    }
    const level = levels[Math.floor(Math.random() * levels.length)];
    if (!level) return;
    // The player watches this editor and cannot type in it.
    const editorEl = h('div', { className: 'ic-editor', inert: true });
    root.replaceChildren(
      h(
        'div',
        { className: 'ic-attract' },
        h(
          'header',
          { className: 'ic-head' },
          h('h1', {}, t(level.title.key as TextKey)),
          h('span', { className: 'ic-tab' }, level.id),
        ),
        editorEl,
        h('p', { className: 'ic-demo', role: 'status' }, t('attract.demo')),
      ),
    );
    const demo = (session = createSession(editorEl, level));
    const keys = parseKeys(shortest(level));
    let step = 0;
    const next = (): void => {
      const key = keys[step++];
      if (key === undefined) {
        timer = setTimeout(end, END_MS);
        return;
      }
      pressKey(demo.view, key);
      timer = setTimeout(next, STEP_MS);
    };
    timer = setTimeout(next, STEP_MS);
  }

  for (const type of INPUTS) window.addEventListener(type, onInput, true);
  arm();
  return stop;
}
