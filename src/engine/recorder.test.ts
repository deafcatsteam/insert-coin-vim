import { vim } from '@replit/codemirror-vim';
import { EditorView } from 'codemirror';
import { expect, test } from 'vitest';
import { createRecorder } from './recorder';

const setup = () => {
  const view = new EditorView({
    doc: 'one\ntwo',
    extensions: [vim()],
    parent: document.body,
  });
  const blocked: string[] = [];
  const recorder = createRecorder(view, (key, isBlocked) => {
    if (isBlocked) blocked.push(key);
  });
  const press = (key: string, target: Element = view.contentDOM): void => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };
  return { view, recorder, blocked, press };
};

test('records normal-mode keys', () => {
  const { view, recorder, press } = setup();
  press('d');
  press('d');
  expect(recorder.keys).toEqual(['d', 'd']);
  expect(view.state.doc.toString()).toBe('two');
});

test('records insert-mode keys and Escape', () => {
  const { recorder, press } = setup();
  press('i');
  press('a');
  press('Escape');
  expect(recorder.keys).toEqual(['i', 'a', '<Esc>']);
});

test('ignores bare modifiers', () => {
  const { recorder, press } = setup();
  press('Shift');
  press('Control');
  expect(recorder.keys).toEqual([]);
});

test('records keys typed on the ex command line', () => {
  const { view, recorder, press } = setup();
  press(':');
  const input = view.dom.querySelector('.cm-vim-panel input');
  if (!input) throw new Error('ex command line did not open');
  press('s', input);
  press('Enter', input);
  expect(recorder.keys).toEqual([':', 's', '<CR>']);
});

test('blocks forbidden keys without recording them', () => {
  const { view, recorder, blocked, press } = setup();
  recorder.forbidden = new Set(['x']);
  press('x');
  expect(view.state.doc.toString()).toBe('one\ntwo');
  expect(recorder.keys).toEqual([]);
  expect(blocked).toEqual(['x']);
});

test('allows forbidden keys in insert mode', () => {
  const { recorder, press } = setup();
  recorder.forbidden = new Set(['x']);
  press('i');
  press('x');
  expect(recorder.keys).toEqual(['i', 'x']);
});

test('ignores the repeat of a key held before the editor had focus', () => {
  const { view, recorder, press } = setup();
  const repeat = (): void => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  };
  repeat();
  expect(recorder.keys).toEqual([]);
  press('j');
  repeat();
  expect(recorder.keys).toEqual(['j', '<CR>']);
});

test('reset clears the count', () => {
  const { recorder, press } = setup();
  press('j');
  recorder.reset();
  expect(recorder.keys).toEqual([]);
});
