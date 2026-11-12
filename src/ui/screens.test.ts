import { EditorView } from 'codemirror';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { press } from '../engine/replay';
import type { Level } from '../levels/levels';
import { showGame, type Attempt } from './game';
import { showResults } from './results';

const level: Level = {
  id: 't',
  chapter: 1,
  title: { key: 'levels.s01-delete-word.title' },
  concepts: ['delete-char'],
  start: 'xab\n',
  target: 'b\n',
  forbiddenKeys: ['d'],
  par: 3,
  optimal: 2,
  solutions: ['lxx', 'xx'],
  hints: [],
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

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test('the game screen shows the level, the fault and the end of the attempt', () => {
  let attempt: Attempt | undefined;
  const close = showGame(
    root,
    level,
    (a) => (attempt = a),
    () => undefined,
  );
  expect(root.querySelector('h1')?.textContent).toBe('Delete a word');
  expect(root.querySelector('.ic-target')?.textContent).toBe('b\n');
  expect(root.querySelector('.cm-content .ic-diff')?.textContent).toBe('xa');

  press(view(), 'd');
  expect(root.querySelector('.ic-denied')?.textContent).toBe('⚠ ACCESS DENIED');
  press(view(), 'x');
  expect(root.querySelector('.ic-denied')?.textContent).toBe('');
  expect(attempt).toBeUndefined();

  press(view(), 'x');
  vi.runAllTimers();
  expect(attempt).toMatchObject({ keys: ['x', 'x'], faults: 1 });
  close();
});

test('a closed game screen does not report its attempt', () => {
  const onDone = vi.fn();
  const close = showGame(root, level, onDone, () => undefined);
  press(view(), 'xx');
  close();
  vi.runAllTimers();
  expect(onDone).not.toHaveBeenCalled();
});

test('the results screen shows stars and replays the shortest solution', () => {
  const next = vi.fn();
  const close = showResults(
    root,
    level,
    { keys: ['l', 'x', 'x'], faults: 0, ms: 75_000 },
    { retry: () => undefined, next },
  );
  expect(root.querySelector('.ic-stars')?.textContent).toBe('★★☆');
  expect(root.textContent).toContain('3 keys (par 3)');
  expect(root.textContent).toContain('Time: 01:15');
  expect(root.textContent).toContain('Optimal solution (2 keys)');

  const [watch, , nextButton] = root.querySelectorAll('button');
  expect(document.activeElement).toBe(nextButton);
  watch?.click();
  vi.runAllTimers();
  expect(view().state.doc.toString()).toBe('b\n');

  nextButton?.click();
  expect(next).toHaveBeenCalledOnce();
  close();
});
