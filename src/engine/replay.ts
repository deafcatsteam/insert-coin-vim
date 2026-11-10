import { getCM } from '@replit/codemirror-vim';
import { EditorView } from 'codemirror';
import { parseKeys } from '../scoring/keys';
import { createEditor, type EditorLevel } from './editor';
import { createRecorder } from './recorder';

export type ReplayLevel = EditorLevel;

const KEY_NAMES: Record<string, string> = {
  Esc: 'Escape',
  CR: 'Enter',
  BS: 'Backspace',
  Space: ' ',
  lt: '<',
  Del: 'Delete',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
};

/** Turns one key in Vim notation into the keydown a browser would send for it. */
const toEventInit = (token: string): KeyboardEventInit & { key: string } => {
  const named = /^<((?:[CSAMD]-)*)(.+)>$/su.exec(token);
  if (!named) return { key: token };
  const mods = named[1] ?? '';
  const name = named[2] ?? '';
  return {
    key: KEY_NAMES[name] ?? name,
    // The plugin's command line reads the legacy keyCode for Enter and Escape.
    keyCode: { CR: 13, Esc: 27 }[name],
    ctrlKey: mods.includes('C'),
    shiftKey: mods.includes('S'),
    altKey: mods.includes('A'),
    metaKey: /[MD]/.test(mods),
  };
};

/** Types keys in Vim notation into an editor through the same keydown path as a player. */
export function press(view: EditorView, solution: string): void {
  const cm = getCM(view);
  // jsdom has no layout, so the plugin's pixel-based check in "j"/"k" jumps to the last line.
  // shortcut: display-line motions (gj, gk) do nothing here; replay those in a real browser.
  if (cm) cm.findPosV = (start) => start;

  for (const token of parseKeys(solution)) {
    const init = { ...toEventInit(token), bubbles: true, cancelable: true };
    // The ":" and "/" command line is a separate input inside the editor.
    const target =
      view.dom.querySelector<HTMLInputElement>('.cm-vim-panel input') ??
      view.contentDOM;
    const unhandled = target.dispatchEvent(new KeyboardEvent('keydown', init));
    // A browser types an unhandled printable key into the focused element; jsdom does not.
    if (unhandled && init.key.length === 1 && !init.ctrlKey && !init.metaKey) {
      if (target instanceof HTMLInputElement) target.value += init.key;
      // A frozen editor takes no text.
      else if (view.state.facet(EditorView.editable))
        view.dispatch(view.state.replaceSelection(init.key), {
          userEvent: 'input.type',
        });
    }
    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }
}

/**
 * Plays a solution on a fresh editor.
 * Returns the final buffer and the number of keys the recorder counted.
 */
export function replay(
  level: ReplayLevel,
  solution: string,
): { buffer: string; keys: number } {
  const view = createEditor(level, document.body);
  const recorder = createRecorder(view);
  press(view, solution);

  const result = {
    buffer: view.state.doc.toString(),
    keys: recorder.keys.length,
  };
  recorder.destroy();
  view.destroy();
  return result;
}
