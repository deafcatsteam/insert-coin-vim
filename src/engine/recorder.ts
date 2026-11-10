import { getCM, Vim } from '@replit/codemirror-vim';
import type { EditorView } from 'codemirror';

export interface Recorder {
  /** Keys in Vim notation, in typing order. One entry is one VimGolf keystroke. */
  readonly keys: readonly string[];
  /** Keys in Vim notation that are swallowed, except in insert mode and on the command line. */
  forbidden: ReadonlySet<string>;
  reset(): void;
  destroy(): void;
}

/**
 * Records every key the Vim layer receives. `onKey` runs after each key;
 * `blocked` is true for a forbidden key, which is not recorded.
 */
export function createRecorder(
  view: EditorView,
  onKey: (key: string, blocked: boolean) => void = () => undefined,
): Recorder {
  const cm = getCM(view);
  if (!cm) throw new Error('vim adapter not attached');

  const keys: string[] = [];
  const record = (key: string): void => {
    keys.push(key);
    onKey(key, false);
  };

  // Fires for every key the plugin passes to Vim, in all modes, dead keys included.
  const onInput = (e: { type: string; key?: string }): void => {
    if (e.type === 'handleKey' && e.key) record(e.key);
  };
  cm.on('inputEvent', onInput);

  const onKeydown = (e: KeyboardEvent): void => {
    const key = Vim.vimKeyFromEvent(e);
    if (!key) return;
    // The ":" and "/" command line is a separate input that never reaches inputEvent.
    if (e.target instanceof Element && e.target.closest('.cm-vim-panel')) {
      record(key);
      return;
    }
    if (recorder.forbidden.has(key) && !cm.state.vim?.insertMode) {
      // shortcut: blocks by key, not by command ("fx" with "x" forbidden is blocked too),
      // and misses dead-key input; upgrade when levels define forbiddenKeys semantics.
      e.preventDefault();
      e.stopPropagation();
      onKey(key, true);
    }
  };
  // Capture phase on the editor root: runs before the plugin's own keydown handler.
  view.dom.addEventListener('keydown', onKeydown, true);

  const recorder: Recorder = {
    keys,
    forbidden: new Set(),
    reset: () => {
      keys.length = 0;
    },
    destroy: () => {
      cm.off('inputEvent', onInput);
      view.dom.removeEventListener('keydown', onKeydown, true);
    },
  };
  return recorder;
}
