import { Compartment, type Extension } from '@codemirror/state';
import { Vim } from '@replit/codemirror-vim';
import { EditorView } from 'codemirror';
import { createEditor, type EditorLevel } from './editor';
import { matches } from './match';
import { createRecorder } from './recorder';

export const EXITS = ['w', 'q', 'wq', 'q!'] as const;

/** The level fields (SPEC §7) that one attempt needs. */
export interface SessionLevel extends EditorLevel {
  target: string;
  forbiddenKeys?: readonly string[];
  /** The level ends on this Ex command instead of on the buffer match alone. */
  exit?: (typeof EXITS)[number];
}

/** One attempt at a level. A reset is a new session. */
export interface Session {
  readonly view: EditorView;
  /** Keys in Vim notation, in typing order. One entry is one VimGolf keystroke. */
  readonly keys: readonly string[];
  /** Number of forbidden keys pressed. They are not applied and not in `keys`. */
  readonly faults: number;
  /** True once the level is complete. The editor is then frozen. */
  readonly done: boolean;
  destroy(): void;
}

// Ex commands are global in the plugin; each one finds its session through the editor.
// The game has no file: ":w" and ":q" do nothing outside a level that asks for them.
// shortcut: ":x" and "ZZ" are not exits; add them when a level teaches them.
const exitHandlers = new WeakMap<EditorView, (command: string) => void>();
for (const [name, prefix, command] of [
  ['write', 'w', 'w'],
  ['quit', 'q', 'q'],
  ['wq', 'wq', 'wq'],
] as const)
  Vim.defineEx(name, prefix, (cm, params) => {
    const bang = params.input.trimEnd().endsWith('!') ? '!' : '';
    exitHandlers.get(cm.cm6)?.(command + bang);
  });

/** `onChange` runs after every key, blocked or not, and after every buffer change. */
export function createSession(
  parent: Element,
  level: SessionLevel,
  onChange: () => void = () => undefined,
  extensions: Extension = [],
): Session {
  let faults = 0;
  let done = false;
  const editable = new Compartment();
  const finish = (): void => {
    done = true;
    recorder.frozen = true;
    // Also stops typing that does not go through keydown, in insert mode.
    view.dispatch({
      effects: editable.reconfigure(EditorView.editable.of(false)),
    });
  };

  const view = createEditor(level, parent, [
    editable.of([]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (
        !done &&
        !level.exit &&
        matches(update.state.doc.toString(), level.target)
      )
        finish();
      onChange();
    }),
    extensions,
  ]);
  const recorder = createRecorder(view, (_key, blocked) => {
    if (blocked) faults++;
    onChange();
  });
  recorder.forbidden = new Set(level.forbiddenKeys);
  exitHandlers.set(view, (command) => {
    if (
      done ||
      command !== level.exit ||
      !matches(view.state.doc.toString(), level.target)
    )
      return;
    finish();
    onChange();
  });

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
