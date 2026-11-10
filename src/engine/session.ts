import { Compartment } from '@codemirror/state';
import { EditorView } from 'codemirror';
import { createEditor, type EditorLevel } from './editor';
import { matches } from './match';
import { createRecorder } from './recorder';

/** The level fields (SPEC §7) that one attempt needs. */
export interface SessionLevel extends EditorLevel {
  target: string;
  forbiddenKeys?: readonly string[];
}

/** One attempt at a level. A reset is a new session. */
export interface Session {
  readonly view: EditorView;
  /** Keys in Vim notation, in typing order. One entry is one VimGolf keystroke. */
  readonly keys: readonly string[];
  /** Number of forbidden keys pressed. They are not applied and not in `keys`. */
  readonly faults: number;
  /** True once the buffer equals the target. The editor is then frozen. */
  readonly done: boolean;
  destroy(): void;
}

/** `onChange` runs after every key, blocked or not, and after every buffer change. */
export function createSession(
  parent: Element,
  level: SessionLevel,
  onChange: () => void = () => undefined,
): Session {
  let faults = 0;
  let done = false;
  const editable = new Compartment();

  const view = createEditor(level, parent, [
    editable.of([]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (!done && matches(update.state.doc.toString(), level.target)) {
        done = true;
        recorder.frozen = true;
        // Also stops typing that does not go through keydown, in insert mode.
        view.dispatch({
          effects: editable.reconfigure(EditorView.editable.of(false)),
        });
      }
      onChange();
    }),
  ]);
  const recorder = createRecorder(view, (_key, blocked) => {
    if (blocked) faults++;
    onChange();
  });
  recorder.forbidden = new Set(level.forbiddenKeys);

  return {
    view,
    get keys() {
      return recorder.keys;
    },
    get faults() {
      return faults;
    },
    get done() {
      return done;
    },
    destroy: () => {
      recorder.destroy();
      view.destroy();
    },
  };
}
