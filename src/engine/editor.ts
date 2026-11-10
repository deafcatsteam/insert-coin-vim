import { EditorState, type Extension } from '@codemirror/state';
import { Vim, vim } from '@replit/codemirror-vim';
import { EditorView, minimalSetup } from 'codemirror';

/** The level fields (SPEC §7) that an editor needs. */
export interface EditorLevel {
  start: string;
  cursor?: { line: number; ch: number };
}

/**
 * The one editor setup of the game, the headless replay and the manual page,
 * so a solution that passes in CI does the same for the player.
 */
export function createEditor(
  level: EditorLevel,
  parent: Element,
  extensions: Extension = [],
): EditorView {
  // Vim keeps macro recording, registers and the last search across editors.
  Vim.resetVimGlobalState_();
  const view = new EditorView({
    doc: level.start,
    // "u" needs the history from minimalSetup; "<C-v>" blocks need multiple selections.
    // No basicSetup: its bracket closing and completion change what a keystroke does.
    extensions: [
      vim(),
      minimalSetup,
      EditorState.allowMultipleSelections.of(true),
      extensions,
    ],
    parent,
  });
  if (level.cursor) {
    const line = view.state.doc.line(level.cursor.line + 1);
    view.dispatch({ selection: { anchor: line.from + level.cursor.ch } });
  }
  return view;
}
