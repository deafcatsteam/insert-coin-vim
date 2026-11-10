import { getCM, Vim, vim } from '@replit/codemirror-vim';
import { EditorView } from 'codemirror';
import { expect, test } from 'vitest';

test('vim mode edits a buffer headlessly', () => {
  const view = new EditorView({ doc: 'hello', extensions: [vim()] });
  const cm = getCM(view);
  if (!cm) throw new Error('vim adapter not attached');

  Vim.handleKey(cm, 'x', 'user');

  expect(view.state.doc.toString()).toBe('ello');
});
