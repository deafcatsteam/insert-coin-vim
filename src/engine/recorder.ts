import { getCM, Vim } from '@replit/codemirror-vim';
import type { EditorView } from 'codemirror';

export interface Recorder {
  /** Keys in Vim notation, in typing order. One entry is one VimGolf keystroke. */
  readonly keys: readonly string[];
  /** Keys in Vim notation that are swallowed, except in insert mode and on the command line. */
  forbidden: ReadonlySet<string>;
  /** While true, no key reaches Vim and none is recorded. */
  frozen: boolean;
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
    if (recorder.frozen) {
      // No preventDefault: browser keys such as Tab and F5 must keep working.
      e.stopPropagation();
      return;
    }
    const onCommandLine =
      e.target instanceof Element && !!e.target.closest('.cm-vim-panel');
    // A dead key followed by a letter it cannot accent arrives as one keydown ("^x",
    // seen in Gecko on AZERTY). Vim needs two keys.
    // shortcut: a composed letter ("à" from "`" then "a") is not split; upgrade when
    // levels use "`" marks (chapter 8).
    if (
      /^[\^`~¨].$/u.test(e.key) &&
      !onCommandLine &&
      !cm.state.vim?.insertMode
    ) {
      e.preventDefault();
      e.stopPropagation();
      for (const part of e.key)
        e.target?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: part,
            bubbles: true,
            cancelable: true,
          }),
        );
      return;
    }
    const key = Vim.vimKeyFromEvent(e);
    if (!key) return;
    // The ":" and "/" command line is a separate input that never reaches inputEvent.
    if (onCommandLine) {
      record(key);
      return;
    }
    if (recorder.forbidden.has(key) && !cm.state.vim?.insertMode) {
      // shortcut: blocks by key, not by command ("fx" with "x" forbidden is blocked too);
      // upgrade when a level needs a forbidden key as the argument of another command.
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
    frozen: false,
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
