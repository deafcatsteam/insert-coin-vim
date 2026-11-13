import { EditorView } from 'codemirror';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { press } from '../engine/replay';
import { levels, type Level } from '../levels/levels';
import { recordGolf, recordResult, recordRun } from '../progress/save';
import { attract, ATTRACT_IDLE_MS } from './attract';
import { showGame, type Attempt, type GameActions, type Visit } from './game';
import { applyDisplay } from './display';
import { showBoot, showGolf, showSelect, showTitle } from './menu';
import { clock, shareText, showResults, showRun } from './results';

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

test('the game screen shows a macro recording', async () => {
  const close = showGame(root, level, visit(), actions());
  const rec = root.querySelector<HTMLElement>('.ic-rec');
  await Promise.resolve();
  expect(rec?.hidden).toBe(true);
  press(view(), 'qa');
  await Promise.resolve();
  expect(rec?.hidden).toBe(false);
  expect(rec?.textContent).toBe('REC @a');
  press(view(), 'q');
  await Promise.resolve();
  expect(rec?.hidden).toBe(true);
  close();
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

const attempt: Attempt = {
  keys: ['l', 'x', 'x'],
  faults: 0,
  ms: 14_000,
  shown: false,
};
const noActions = { retry: () => undefined, menu: () => undefined };

test('the share text tells the score and links to the game', () => {
  expect(shareText(level, attempt)).toBe(
    'INSERT COIN t ★★☆\n3 keys (par 3) · 00:14\nhttps://deafcatsteam.github.io/insert-coin-vim/',
  );
  expect(shareText(level, attempt, 7)).toBe(
    'INSERT COIN #007 ★★☆\n3 keys (par 3) · 00:14\nhttps://deafcatsteam.github.io/insert-coin-vim/#daily',
  );
});

test('copy result puts the share text on the clipboard', async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  try {
    const close = showResults(root, level, attempt, noActions, 7);
    // A daily challenge has no next level, and says nothing about it.
    expect(root.textContent).not.toContain('No more levels');
    button('Copy result').click();
    await vi.runAllTimersAsync();
    expect(writeText).toHaveBeenCalledWith(shareText(level, attempt, 7));
    expect(root.textContent).toContain('Result copied.');
    expect(root.querySelector('textarea')?.hidden).toBe(true);
    close();
  } finally {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
});

test('fewer keys than the reference solution are celebrated', () => {
  const best = 'Shorter than our reference solution';
  showResults(root, level, attempt, noActions)();
  expect(root.textContent).not.toContain(best);
  const short = { ...attempt, keys: ['x'] };
  showResults(root, level, short, noActions)();
  expect(root.textContent).toContain(best);
  showResults(root, level, { ...short, shown: true }, noActions)();
  expect(root.textContent).not.toContain(best);
});

test('without a clipboard, copy result shows the text to copy by hand', async () => {
  const close = showResults(root, level, attempt, noActions);
  button('Copy result').click();
  await vi.runAllTimersAsync();
  const text = root.querySelector('textarea');
  expect(text?.hidden).toBe(false);
  expect(text?.value).toBe(shareText(level, attempt));
  expect(root.textContent).toContain('The browser blocked the copy.');
  close();
});

test('the title screen starts and the level list shows the saved stars', () => {
  const start = vi.fn();
  const daily = vi.fn();
  const review = vi.fn();
  showTitle(root, start, daily, review, 2);
  expect(document.activeElement).toBe(button('Start'));
  button('Start').click();
  expect(start).toHaveBeenCalledOnce();
  button('Daily challenge').click();
  expect(daily).toHaveBeenCalledOnce();
  expect(button('Review').textContent).toBe('Review (2)');
  button('Review').click();
  expect(review).toHaveBeenCalledOnce();

  recordResult('t', { stars: 2, keys: 3 });
  const pick = vi.fn();
  const other = { ...level, id: 'u', chapter: 2 };
  const back = vi.fn();
  showSelect(root, [level, other], pick, back);
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

  button('Title').click();
  open?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  expect(back).toHaveBeenCalledTimes(2);
});

test('a display setting turns its effect off and stays off', () => {
  applyDisplay();
  expect(document.documentElement.classList).toContain('fx-glow');

  const title = (): void => {
    showTitle(
      root,
      () => undefined,
      () => undefined,
      () => undefined,
      0,
    );
  };
  title();
  const boxes = [...root.querySelectorAll('input')];
  // Four display effects on, then the sound, off by default.
  expect(boxes.map((b) => b.checked)).toEqual([true, true, true, true, false]);
  boxes[1]?.click();
  expect(document.documentElement.classList).not.toContain('fx-glow');
  expect(document.documentElement.classList).toContain('fx-scanlines');

  title();
  expect(root.querySelectorAll('input')[1]?.checked).toBe(false);
});

test('the theme list shows the unlocked themes only, and the choice stays', () => {
  const title = (): void => {
    showTitle(
      root,
      () => undefined,
      () => undefined,
      () => undefined,
      0,
    );
  };
  const theme = (): HTMLSelectElement | null => root.querySelector('select');
  const pick = (value: string): void => {
    const select = theme();
    if (!select) throw new Error('no theme list');
    select.value = value;
    select.dispatchEvent(new Event('change'));
  };

  for (const { id } of levels.slice(1)) recordResult(id, { stars: 1, keys: 9 });
  title();
  // The last chapter is done: Paper only.
  expect([...(theme()?.options ?? [])].map((o) => o.textContent)).toEqual([
    'Amber screen',
    'Paper screen',
  ]);
  pick('paper');
  expect(document.documentElement.classList).toContain('theme-paper');

  recordResult(levels[0]?.id ?? '', { stars: 1, keys: 9 });
  title();
  expect([...(theme()?.options ?? [])].map((o) => o.value)).toEqual([
    'amber',
    'olive',
    'paper',
  ]);
  expect(theme()?.value).toBe('paper');
  pick('olive');
  expect(document.documentElement.classList).toContain('theme-olive');
  expect(document.documentElement.classList).not.toContain('theme-paper');
  pick('amber');
  expect(document.documentElement.classList).not.toContain('theme-olive');
});

test('a stored theme the save does not unlock stays off', () => {
  localStorage.setItem('insert-coin-theme', 'ice');
  applyDisplay();
  expect(document.documentElement.classList).not.toContain('theme-ice');
  recordRun(0, { ms: 1000, splits: [1000] });
  applyDisplay();
  expect(document.documentElement.classList).toContain('theme-ice');
  localStorage.clear();
  applyDisplay();
});

test('the results screen tells the player about the unlocked themes', () => {
  const unlocked =
    'Unlocked: LCD olive screen. Pick it in the display settings.';
  showResults(root, level, attempt, noActions)();
  expect(root.textContent).not.toContain('Unlocked');
  showResults(root, level, attempt, noActions, undefined, false, ['olive'])();
  expect(root.textContent).toContain(unlocked);
});

test('the title screen shows the badges earned', () => {
  const title = (): void => {
    showTitle(
      root,
      () => undefined,
      () => undefined,
      () => undefined,
      0,
    );
  };
  title();
  expect(root.querySelector('.ic-badges')).toBeNull();
  for (const { id } of levels)
    recordResult(id, { stars: 3, keys: 9, noArrows: true });
  title();
  expect(
    [...root.querySelectorAll('.ic-badges li')].map((e) => e.textContent),
  ).toEqual([
    'Campaign cleared',
    '★★★ everywhere',
    'A chapter with no arrow keys',
  ]);
});

test('the support links show at the end of a chapter only', () => {
  showResults(root, level, attempt, noActions)();
  expect(root.querySelector('.ic-support')).toBeNull();
  showResults(root, level, attempt, noActions, undefined, true)();
  expect(
    [...root.querySelectorAll('.ic-support a')].map((a) => a.textContent),
  ).toEqual(['Ko-fi', 'GitHub Sponsors']);
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

test('a Speedrun level has no hints, no solution and no skip', () => {
  const close = showGame(root, level, visit(4), actions(), true);
  expect(root.textContent).not.toContain('Hint');
  expect(root.textContent).not.toContain('Show solution');
  expect(root.textContent).not.toContain('Skip');
  vi.advanceTimersByTime(60_000);
  expect(root.textContent).not.toContain('Hint');
  close();
});

test('the level list offers the Speedrun of a finished chapter only', () => {
  const other = { ...level, id: 'u', chapter: 2 };
  const onRun = vi.fn();
  recordResult('t', { stars: 1, keys: 9 });
  showSelect(root, [level, other], vi.fn(), vi.fn(), '', onRun);
  expect(button('Speedrun').textContent).toBe('Speedrun');
  expect(
    [...root.querySelectorAll('button')].filter((b) =>
      b.textContent.startsWith('Speedrun'),
    ),
  ).toHaveLength(1);
  button('Speedrun').click();
  expect(onRun).toHaveBeenCalledWith(1);

  recordRun(1, { ms: 83_400, splits: [83_400] });
  showSelect(root, [level, other], vi.fn(), vi.fn(), '', onRun);
  expect(button('Speedrun').textContent).toBe('Speedrun · record 01:23.4');
});

test('the end of a Speedrun shows the time, the record and the splits', () => {
  const two = [level, { ...level, id: 'u' }];
  const retry = vi.fn();
  const old = { ms: 20_000, splits: [9_000, 20_000] };
  const sign = vi.fn();
  showRun(root, two, { ms: 18_000, splits: [9_030, 18_000] }, old, {
    retry,
    menu: vi.fn(),
    sign,
  });
  expect(root.querySelector('h1')?.textContent).toBe('Speedrun — chapter 1');
  expect(root.textContent).toContain('Time: 00:18.0');
  expect(root.textContent).toContain('NEW RECORD');
  expect([...root.querySelectorAll('li')].map((e) => e.textContent)).toEqual([
    'Delete a word 00:09.0 ±0.0',
    'Delete a word 00:18.0 −2.0',
  ]);
  // A new record asks for initials: letters only, upper case, three of them.
  const initials = root.querySelector<HTMLInputElement>('.ic-sign input');
  const form = root.querySelector('form');
  if (!initials || !form) throw new Error('no initials');
  expect(document.activeElement).toBe(initials);
  initials.value = 'é1a';
  initials.dispatchEvent(new Event('input'));
  expect(initials.value).toBe('A');
  form.requestSubmit();
  expect(sign).not.toHaveBeenCalled();
  expect(root.textContent).toContain('Type 3 letters');
  initials.value = 'abc';
  initials.dispatchEvent(new Event('input'));
  form.requestSubmit();
  expect(sign).toHaveBeenCalledWith('ABC');
  expect(root.textContent).toContain('Record signed ABC.');
  expect(document.activeElement).toBe(button('Retry'));
  button('Retry').click();
  expect(retry).toHaveBeenCalledOnce();

  showRun(root, two, { ms: 25_000, splits: [10_000, 25_000] }, old, {
    retry,
    menu: vi.fn(),
    sign,
  });
  expect(root.textContent).not.toContain('NEW RECORD');
  expect(root.textContent).toContain('Record: 00:20.0');
  expect(root.querySelector('form')).toBeNull();
  expect(document.activeElement).toBe(button('Retry'));
});

test('the clock rounds to seconds, or to tenths for Speedruns', () => {
  expect(clock(83_449)).toBe('01:23');
  expect(clock(83_449, true)).toBe('01:23.4');
  expect(clock(59_960, true)).toBe('01:00.0');
});

test('Free Golf is on the title screen once a level is done', () => {
  showTitle(root, vi.fn(), vi.fn(), vi.fn(), 0);
  expect(() => button('Free Golf')).toThrow();
  const golf = vi.fn();
  showTitle(root, vi.fn(), vi.fn(), vi.fn(), 0, golf);
  button('Free Golf').click();
  expect(golf).toHaveBeenCalledOnce();
});

test('the Free Golf list shows the levels done, their record and the reference', () => {
  const other = { ...level, id: 'u' };
  const third = { ...level, id: 'v', chapter: 2 };
  recordResult('t', { stars: 1, keys: 9 });
  recordResult('u', { stars: 3, keys: 2 });
  recordGolf('u', 4);
  const pick = vi.fn();
  const back = vi.fn();
  showGolf(root, [level, other, third], undefined, pick, back);
  expect([...root.querySelectorAll('h2')].map((e) => e.textContent)).toEqual([
    'Chapter 1',
    'Expert pack',
  ]);
  expect(root.textContent).toContain(
    'Finish chapter 11 to unlock the expert pack.',
  );
  const items = [...root.querySelectorAll('li button')];
  expect(items.map((e) => e.textContent)).toEqual([
    'Delete a word · reference 2',
    'Delete a word · record 4 · reference 2',
  ]);
  expect(document.activeElement).toBe(items[0]);
  (items[1] as HTMLButtonElement).click();
  expect(pick).toHaveBeenCalledWith(1);
  items[0]?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  expect(back).toHaveBeenCalledOnce();
});

test('the expert pack is listed once unlocked, after the campaign levels', () => {
  const puzzle = { ...level, id: 'g' };
  recordResult('t', { stars: 1, keys: 9 });
  const pick = vi.fn();
  showGolf(root, [level, { ...level, id: 'u' }], [puzzle], pick, vi.fn());
  expect(root.textContent).not.toContain('unlock');
  const items = [...root.querySelectorAll('li button')];
  expect(items).toHaveLength(2);
  (items[1] as HTMLButtonElement).click();
  expect(pick).toHaveBeenCalledWith(2);
});

test('a Free Golf level shows the record to beat and no help', () => {
  const close = showGame(
    root,
    level,
    visit(4),
    actions(),
    true,
    'To beat: 4 keys',
  );
  expect(root.textContent).toContain('To beat: 4 keys');
  expect(root.textContent).not.toContain('Show solution');
  close();
});

test('the end of a Free Golf level shows the keys against the record, no stars', () => {
  const attempt: Attempt = {
    keys: ['x', 'x'],
    faults: 0,
    ms: 3000,
    shown: false,
  };
  showResults(root, level, attempt, noActions, undefined, false, [], {
    old: 3,
  })();
  expect(root.textContent).toContain('Keys: 2');
  expect(root.textContent).toContain('NEW RECORD');
  expect(root.textContent).toContain('Reference solution (2 keys)');
  expect(root.querySelector('.ic-stars')).toBeNull();
  expect(() => button('Copy result')).toThrow();
  expect(root.textContent).not.toContain('No more levels');

  showResults(root, level, attempt, noActions, undefined, false, [], {
    old: 2,
  })();
  expect(root.textContent).not.toContain('NEW RECORD');
  expect(root.textContent).toContain('Record: 2 keys');
});

test('the initials of an earlier record fill the field, and the level list shows them', () => {
  recordRun(1, { ms: 9_000, splits: [9_000], initials: 'ZED' });
  showRun(
    root,
    [level],
    { ms: 8_000, splits: [8_000] },
    undefined,
    { retry: vi.fn(), menu: vi.fn(), sign: vi.fn() },
    ['ice'],
  );
  expect(root.querySelector<HTMLInputElement>('.ic-sign input')?.value).toBe(
    'ZED',
  );
  expect(root.textContent).toContain('Unlocked: Ice screen.');
  recordResult(level.id, { stars: 1, keys: 9 });
  showSelect(root, [level], vi.fn(), vi.fn(), '', vi.fn());
  expect(button('Speedrun').textContent).toBe('Speedrun · record 00:09.0 ZED');
});

describe('attract mode', () => {
  const reduced = (matches: boolean): void => {
    vi.stubGlobal('matchMedia', () => ({
      matches,
      addListener: () => undefined,
      removeListener: () => undefined,
    }));
  };
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('an idle title replays a solution; a key brings the title back', () => {
    reduced(false);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const back = vi.fn();
    root.replaceChildren('title');
    const stop = attract(root, [level], back);
    vi.advanceTimersByTime(ATTRACT_IDLE_MS - 1000);
    // Any input keeps the title awake.
    window.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(ATTRACT_IDLE_MS - 1000);
    expect(root.textContent).toBe('title');
    vi.advanceTimersByTime(1000);
    expect(root.textContent).toContain('DEMO');
    // Two keys, 400 ms apart; the buffer stays 2 s after.
    vi.advanceTimersByTime(1_000);
    expect(view().state.doc.toString()).toBe(level.target);
    expect(back).not.toHaveBeenCalled();
    const key = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    window.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    expect(back).toHaveBeenCalledOnce();
    expect(root.querySelector('.cm-editor')).toBeNull();
    stop();
  });

  test('the demo ends alone, and the title gives way to no demo once stopped', () => {
    reduced(false);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const back = vi.fn();
    attract(root, [level], back);
    vi.advanceTimersByTime(ATTRACT_IDLE_MS + 10_000);
    expect(back).toHaveBeenCalledOnce();

    const stop = attract(root, [level], back);
    root.replaceChildren('levels');
    stop();
    vi.advanceTimersByTime(ATTRACT_IDLE_MS * 2);
    expect(root.textContent).toBe('levels');
  });

  test('no demo for less motion, nor while the page has no focus', () => {
    reduced(true);
    root.replaceChildren('title');
    attract(root, [level], vi.fn());
    vi.advanceTimersByTime(ATTRACT_IDLE_MS * 2);
    expect(root.textContent).toBe('title');

    reduced(false);
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const stop = attract(root, [level], vi.fn());
    vi.advanceTimersByTime(ATTRACT_IDLE_MS * 2);
    expect(root.textContent).toBe('title');
    stop();
  });
});
