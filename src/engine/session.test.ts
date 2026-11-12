import { expect, test } from 'vitest';
import { press as notation } from './replay';
import { createSession, type SessionLevel } from './session';

const play = (level: SessionLevel) => {
  let changes = 0;
  const session = createSession(document.body, level, () => changes++);
  const press = (...keys: string[]): void => {
    for (const key of keys)
      session.view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
  };
  return { session, press, changes: () => changes };
};
const buffer = (session: { view: { state: { doc: object } } }): string =>
  String(session.view.state.doc);

test('completes when the buffer equals the target, then ignores keys', () => {
  const { session, press, changes } = play({
    start: 'one\ntwo\nthree',
    target: 'two\nthree\n',
  });
  expect(session.done).toBe(false);
  press('d', 'd');
  expect(session.done).toBe(true);
  expect(changes()).toBeGreaterThan(0);

  press('d', 'd');
  expect(buffer(session)).toBe('two\nthree');
  expect(session.keys).toEqual(['d', 'd']);
});

test('counts a forbidden key as a fault and does not apply it', () => {
  const { session, press } = play({
    start: 'abc',
    target: 'c',
    forbiddenKeys: ['x'],
  });
  press('x', 'x');
  expect(session.faults).toBe(2);
  expect(session.keys).toEqual([]);
  expect(buffer(session)).toBe('abc');
});

test('starts at the level cursor', () => {
  const { session, press } = play({
    start: 'ab\ncd',
    target: 'ab\nc',
    cursor: { line: 1, ch: 1 },
  });
  press('x');
  expect(session.done).toBe(true);
});

test('a new session does not inherit Vim state from the last one', () => {
  const first = play({ start: 'abc', target: '' });
  first.press('q', 'a'); // starts recording a macro and never stops
  first.session.destroy();

  const { session, press } = play({ start: 'abc', target: 'bc' });
  press('q'); // would stop the recording if it were still running
  press('x'); // so this "x" would delete; in a fresh Vim it names the register of "q"
  expect(buffer(session)).toBe('abc');
});

// SPEC §6 chapter 0: ":w" and ":q" change no text, so the level names its exit command.
test.each(['w', 'q', 'wq', 'q!', 'quit!'])(
  'an exit level ends on its ":%s"',
  (command) => {
    const exit = command === 'quit!' ? 'q!' : (command as 'w');
    const { session } = play({ start: 'abc', target: 'abc', exit });
    for (const other of ['w', 'q', 'wq', 'q!'].filter((c) => c !== exit))
      notation(session.view, `:${other}<CR>`);
    expect(session.done).toBe(false);

    notation(session.view, `:${command}<CR>`);
    expect(session.done).toBe(true);
    expect(buffer(session)).toBe('abc');
  },
);

test('an exit level needs the target text before its exit command', () => {
  const { session } = play({ start: 'abc', target: 'bc', exit: 'wq' });
  notation(session.view, ':wq<CR>');
  expect(session.done).toBe(false);
  notation(session.view, 'x');
  expect(session.done).toBe(false);
  notation(session.view, ':wq<CR>');
  expect(session.done).toBe(true);
  expect(session.keys).toHaveLength(9);
});

test('":w" and ":q" do nothing in a level without an exit', () => {
  const { session } = play({ start: 'abc', target: 'bc' });
  notation(session.view, ':w<CR>:q<CR>:wq<CR>:q!<CR>');
  expect(session.done).toBe(false);
  expect(buffer(session)).toBe('abc');
  expect(session.view.dom.textContent).not.toContain('Not an editor command');
});

// Seen in Gecko on AZERTY: dead key "^" then "x" is one keydown with key "^x".
test('splits a dead key and its letter into two Vim keys', () => {
  const { session, press } = play({ start: '  abc', target: '  bc' });
  press('^x');
  expect(session.keys).toEqual(['^', 'x']);
  expect(session.done).toBe(true);
});

test('a dead-key pair cannot smuggle a forbidden key', () => {
  const { session, press } = play({
    start: '  abc',
    target: '  bc',
    forbiddenKeys: ['x'],
  });
  press('^x');
  expect(session.keys).toEqual(['^']);
  expect(session.faults).toBe(1);
  expect(buffer(session)).toBe('  abc');
});

test('a click right of the text lands on the last character in normal mode', () => {
  const { session, press } = play({ start: 'abc\nde', target: 'ab\nde' });
  const click = (at: number): void =>
    session.view.dispatch({
      selection: { anchor: at },
      userEvent: 'select.pointer',
    });
  click(3);
  expect(session.view.state.selection.main.head).toBe(2);
  press('x');
  expect(session.done).toBe(true);
});

test('a click at the end of the line stays there in insert mode', () => {
  const { session, press } = play({ start: 'abc', target: 'abc!' });
  press('i');
  session.view.dispatch({
    selection: { anchor: 3 },
    userEvent: 'select.pointer',
  });
  expect(session.view.state.selection.main.head).toBe(3);
});
