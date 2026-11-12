import { EditorView } from 'codemirror';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { press } from '../engine/replay';
import type { Level } from '../levels/levels';
import { recordResult } from '../progress/save';
import { showGame, type Attempt, type GameActions, type Visit } from './game';
import { applyDisplay } from './display';
import { showBoot, showSelect, showTitle } from './menu';
import { showResults } from './results';

const level: Level = {
  id: 't',
  chapter: 1,
  title: { key: 'levels.c03-l01.title' },
  brief: { key: 'levels.c03-l01.brief' },
  concepts: ['delete-char'],
  start: 'xab\n',
  target: 'b\n',
  forbiddenKeys: ['d'],
  par: 3,
  optimal: 2,
  solutions: ['lxx', 'xx'],
  hints: [{ key: 'levels.c03-l01.hint1' }, { key: 'levels.c03-l01.hint2' }],
  author: 'test',
  license: 'CC-BY-4.0',
};
const root = document.body;
const view = () => {
  const dom = root.querySelector('.cm-editor');
  if (!dom) throw new Error('no editor on screen');
  // The screens do not expose their editor; reach it the way CodeMirror allows.
  return EditorView.findFromDOM(dom as HTMLElement) as EditorView;
};
const visit = (resets = 0): Visit => ({ resets, idle: false, shown: false });
const actions = (done: GameActions['done'] = () => undefined): GameActions => ({
  done,
  reset: () => undefined,
  skip: () => undefined,
  menu: () => undefined,
});
const button = (text: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) =>
    b.textContent.startsWith(text),
  );
  if (!found) throw new Error(`no button: ${text}`);
  return found;
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

test('the game screen shows the level, the fault and the end of the attempt', () => {
  let attempt: Attempt | undefined;
  const close = showGame(
    root,
    level,
    visit(),
    actions((a) => (attempt = a)),
  );
  expect(root.querySelector('h1')?.textContent).toBe('Delete a word');
  expect(root.querySelector('.ic-brief')?.textContent).toContain('dw deletes');
  expect(root.querySelector('.ic-target')?.textContent).toBe('b\n');
  expect(root.querySelector('.cm-content .ic-diff')?.textContent).toBe('xa');
  expect(root.textContent).not.toContain('Hint');

  press(view(), 'd');
  expect(root.querySelector('.ic-denied')?.textContent).toBe('⚠ ACCESS DENIED');
  press(view(), 'x');
  expect(root.querySelector('.ic-denied')?.textContent).toBe('');
  expect(attempt).toBeUndefined();

  press(view(), 'x');
  vi.runAllTimers();
  expect(attempt).toMatchObject({ keys: ['x', 'x'], faults: 1, shown: false });
  close();
});

test('a closed game screen does not report its attempt', () => {
  const done = vi.fn();
  const close = showGame(root, level, visit(), actions(done));
  press(view(), 'xx');
  close();
  vi.runAllTimers();
  expect(done).not.toHaveBeenCalled();
});

test('hints come with the resets and with a minute without a key', () => {
  showGame(root, level, visit(2), actions())();
  expect(root.textContent).toContain('Hint 1');
  expect(root.textContent).not.toContain('Hint 2');
  expect(button('Show solution').hidden).toBe(true);

  const close = showGame(root, level, visit(), actions());
  vi.advanceTimersByTime(59_000);
  expect(root.textContent).not.toContain('Hint 1');
  vi.advanceTimersByTime(1_000);
  expect(root.textContent).toContain('Hint 1');
  close();
});

test('a shown solution caps the attempt at one star', () => {
  let attempt: Attempt | undefined;
  const close = showGame(
    root,
    level,
    visit(4),
    actions((a) => (attempt = a)),
  );
  expect(root.textContent).toContain('Hint 2');
  button('Show solution').click();
  expect(root.textContent).toContain('Solution: xx');

  press(view(), 'xx');
  vi.runAllTimers();
  close();
  if (!attempt) throw new Error('no attempt');
  expect(attempt.shown).toBe(true);
  showResults(root, level, attempt, {
    retry: () => undefined,
    menu: () => undefined,
  });
  expect(root.querySelector('.ic-stars')?.textContent).toBe('★☆☆');
});

test('the results screen shows stars and replays the shortest solution', () => {
  const next = vi.fn();
  const close = showResults(
    root,
    level,
    { keys: ['l', 'x', 'x'], faults: 0, ms: 75_000, shown: false },
    { retry: () => undefined, next, menu: () => undefined },
  );
  expect(root.querySelector('.ic-stars')?.textContent).toBe('★★☆');
  expect(root.textContent).toContain('3 keys (par 3)');
  expect(root.textContent).toContain('Time: 01:15');
  expect(root.textContent).toContain('Reference solution (2 keys)');

  expect(document.activeElement).toBe(button('Next level'));
  button('Watch it').click();
  vi.runAllTimers();
  expect(view().state.doc.toString()).toBe('b\n');

  button('Next level').click();
  expect(next).toHaveBeenCalledOnce();
  close();
});

test('the title screen starts and the level list shows the saved stars', () => {
  const start = vi.fn();
  showTitle(root, start);
  expect(document.activeElement).toBe(button('Start'));
  button('Start').click();
  expect(start).toHaveBeenCalledOnce();

  recordResult('t', { stars: 2, keys: 3 });
  const pick = vi.fn();
  const other = { ...level, id: 'u', chapter: 2 };
  showSelect(root, [level, other], pick);
  expect([...root.querySelectorAll('h2')].map((e) => e.textContent)).toEqual([
    'Chapter 1',
    'Chapter 2',
  ]);
  const [done, open] = root.querySelectorAll('li button');
  expect(done?.textContent).toBe('Delete a word ★★☆');
  expect(open?.textContent).toBe('Delete a word ☆☆☆');
  expect(document.activeElement).toBe(open);
  (open as HTMLButtonElement).click();
  expect(pick).toHaveBeenCalledWith(1);
});

test('a display setting turns its effect off and stays off', () => {
  applyDisplay();
  expect(document.documentElement.classList).toContain('fx-glow');

  showTitle(root, () => undefined);
  const boxes = [...root.querySelectorAll('input')];
  expect(boxes.map((b) => b.checked)).toEqual([true, true, true, true]);
  boxes[1]?.click();
  expect(document.documentElement.classList).not.toContain('fx-glow');
  expect(document.documentElement.classList).toContain('fx-scanlines');

  showTitle(root, () => undefined);
  expect(root.querySelectorAll('input')[1]?.checked).toBe(false);
});

test('the boot text ends alone or on the first key, one time only', () => {
  const done = vi.fn();
  showBoot(root, done);
  expect(root.textContent).toContain('Ready.');
  vi.runAllTimers();
  expect(done).toHaveBeenCalledTimes(1);

  showBoot(root, done);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
  vi.runAllTimers();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
  expect(done).toHaveBeenCalledTimes(2);
});
