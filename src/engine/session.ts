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
  /** True after an exit command the level did not accept, until the next key. */
  readonly refused: boolean;
  destroy(): void;
}

// Ex commands are global in the plugin; each one finds its session through the editor.
// The game has no file: ":w" and ":q" do nothing outside a level that asks for them.
const exitHandlers = new WeakMap<EditorView, (command: string) => void>();
for (const [name, prefix, command] of [
  ['write', 'w', 'w'],
  ['quit', 'q', 'q'],
  ['wq', 'wq', 'wq'],
  ['xit', 'x', 'x'],
] as const)
  Vim.defineEx(name, prefix, (cm, params) => {
    const bang = params.input.trimEnd().endsWith('!') ? '!' : '';
    exitHandlers.get(cm.cm6)?.(command + bang);
  });
Vim.map('ZZ', ':x<CR>', 'normal');
Vim.map('ZQ', ':q!<CR>', 'normal');
// Other ways real Vim writes and quits; a player who knows Vim types them.
const SAME_AS: Record<string, string> = { 'wq!': 'wq', x: 'wq', 'x!': 'wq' };

/** `onChange` runs after every key, blocked or not, and after every buffer change. */
export function createSession(
  parent: Element,
  level: SessionLevel,
  onChange: () => void = () => undefined,
  extensions: Extension = [],
): Session {
  let faults = 0;
  let done = false;
  let refused = false;
  // ":w" then ":q" also ends a ":wq" level, if no change came between them.
  let saved = false;
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
      saved = false;
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
    refused = false;
    onChange();
  });
  recorder.forbidden = new Set(level.forbiddenKeys);
  exitHandlers.set(view, (typed) => {
    if (done || !level.exit) return;
    const ready = matches(view.state.doc.toString(), level.target);
    const command =
      typed === 'q' && saved && level.exit === 'wq'
        ? 'wq'
        : (SAME_AS[typed] ?? typed);
    if (ready && command === level.exit) finish();
    else if (ready && command === 'w' && level.exit === 'wq') saved = true;
    else refused = true;
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
    get refused() {
      return refused;
    },
    destroy: () => {
      recorder.destroy();
      view.destroy();
    },
  };
}
