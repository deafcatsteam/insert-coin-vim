/** One manual check: the tester presses real keys and the page compares the result. */
export interface Step {
  title: string;
  /** Literal instructions for someone who does not know Vim. */
  how: string[];
  start: string;
  /** Cursor position in `start` as [line, column], both from 0. */
  cursor?: [number, number];
  /** The same keys in Vim notation; the test suite replays them to prove `want`. */
  keys: string;
  /** Buffer that marks the step as passed. */
  want: string;
  /** Text the tester must also get into the paste box. */
  paste?: string;
  /** Text put on the system clipboard when the step starts. */
  clipboard?: string;
  /** Needs the system clipboard, which jsdom does not have. */
  browserOnly?: true;
}

const SYMBOLS = '{}[]()<>|\\/#@$%&*+-=_.,;:!?"\'';
const USEFUL = 'If the text does not match, that is a useful result too.';

// Steps 1 to 6 are the ones to repeat in fullscreen: keep them first.
export const steps: Step[] = [
  {
    title: 'Escape',
    how: [
      'Press i (starts typing mode).',
      'Type XY in capitals.',
      'Press Esc (leaves typing mode).',
      'Press x (deletes the character under the cursor).',
    ],
    start: 'abc',
    keys: 'iXY<Esc>x',
    want: 'Xabc',
  },
  {
    title: 'Ctrl+R',
    how: [
      'Press x (deletes the a).',
      'Press u (undo: the a comes back).',
      'Hold Ctrl and press r (redo: the a goes away again).',
      'If the page reloads instead, that is a valid result: the page records it.',
    ],
    start: 'abc',
    keys: 'xu<C-r>',
    want: 'bc',
  },
  {
    title: 'Ctrl+V',
    how: [
      'Hold Ctrl and press v (starts a block selection).',
      'Press j (extends the selection one line down).',
      'Press d (deletes the selected block).',
    ],
    start: 'ab\ncd\nef',
    keys: '<C-v>jd',
    want: 'b\nd\nef',
  },
  {
    title: 'Ctrl+N',
    how: [
      'Hold Ctrl and press n (moves one line down).',
      'If a new window opens, close it and come back to this page.',
      'Press x (deletes the character under the cursor).',
    ],
    start: 'ab\ncd',
    keys: '<C-n>x',
    want: 'ab\nd',
  },
  {
    title: 'Ctrl+T',
    how: [
      'Press i (starts typing mode).',
      'Hold Ctrl and press t (pushes the line to the right).',
      'If a new tab opens, close it and come back to this page.',
    ],
    start: 'ab',
    keys: 'i<C-t>',
    want: '  ab',
  },
  {
    title: 'Ctrl+W',
    how: [
      'Press A in capitals: Shift + a (goes to the end of the line and starts typing mode).',
      'Hold Ctrl and press w (deletes the word before the cursor).',
      'If the tab closes, open this page again: the page records it.',
    ],
    start: 'foo bar',
    keys: 'A<C-w>',
    want: 'foo ',
  },
  {
    title: 'Symbols',
    how: [
      'Press i (starts typing mode).',
      `Type this line exactly: ${SYMBOLS}`,
      'Do not press Esc: the step must pass while still in typing mode.',
    ],
    start: '',
    keys: `i${SYMBOLS.replace('<', '<lt>')}`,
    want: SYMBOLS,
  },
  {
    title: 'Dead keys while typing',
    how: [
      'Press i (starts typing mode).',
      'Type the three characters ^ ~ ` so that each one appears on screen.',
      'On AZERTY each of them needs a Space after it.',
    ],
    start: '',
    keys: 'i^~`',
    want: '^~`',
  },
  {
    title: 'Digits and dot',
    how: [
      'Press 3 (on AZERTY: Shift + the 3 key of the top row). Nothing visible happens yet.',
      'Press x (with the 3 before it: deletes three characters).',
      'Press . (repeats the last command: deletes three more).',
    ],
    start: 'abcdefg',
    keys: '3x.',
    want: 'g',
  },
  {
    title: '^ without Space',
    how: [
      'Press ^ once (moves to the first letter). Do not press Space.',
      'Press x (deletes the character under the cursor).',
      USEFUL,
    ],
    start: '   abc',
    cursor: [0, 5],
    keys: '^x',
    want: '   bc',
  },
  {
    title: '^ with Space',
    how: [
      'Press ^ once, then Space (moves to the first letter).',
      'Press x (deletes the character under the cursor).',
      USEFUL,
    ],
    start: '   abc',
    cursor: [0, 5],
    keys: '^x',
    want: '   bc',
  },
  {
    title: '~',
    how: [
      'Press ~ once (switches the letter under the cursor to upper case).',
      'If the first letter is still a small a, press Space.',
    ],
    start: 'abc',
    keys: '~',
    want: 'Abc',
  },
  {
    title: '` without Space',
    how: [
      'Press l: a small L (moves one character right).',
      'Press m, then a (remembers this position under the name a).',
      'Press 0: zero (moves to the start of the line).',
      'Press `, then a (jumps back to position a). Do not press Space.',
      'Press x (deletes the character under the cursor).',
      USEFUL,
    ],
    start: 'abc',
    keys: 'lma0`ax',
    want: 'ac',
  },
  {
    title: '` with Space',
    how: [
      'Press l: a small L (moves one character right).',
      'Press m, then a (remembers this position under the name a).',
      'Press 0: zero (moves to the start of the line).',
      'Press `, then Space, then a (jumps back to position a).',
      'Press x (deletes the character under the cursor).',
      USEFUL,
    ],
    start: 'abc',
    keys: 'lma0`ax',
    want: 'ac',
  },
  {
    title: 'Search with /',
    how: [
      'Press / (opens a search line at the bottom of the editor).',
      'Type bar',
      'Press Enter (the cursor jumps to bar).',
      'Press x (deletes the character under the cursor).',
    ],
    start: 'foo bar',
    keys: '/bar<CR>x',
    want: 'foo ar',
  },
  {
    title: 'Command with :',
    how: [
      'Press : (opens a command line at the bottom of the editor).',
      'Press d',
      'Press Enter (runs the command: deletes the current line).',
    ],
    start: 'a\nb',
    keys: ':d<CR>',
    want: 'b',
  },
  {
    title: '} with AltGr',
    how: [
      'Press } (jumps to the next empty line).',
      'Press d twice (deletes that line).',
    ],
    start: 'a\n\nb',
    keys: '}dd',
    want: 'a\nb',
  },
  {
    title: 'Macro with @',
    how: [
      'Press q, then a (starts recording keys under the name a).',
      'Press x (deletes one character).',
      'Press q (stops recording).',
      'Press @, then a (plays the recording: deletes one more character).',
    ],
    start: 'abc',
    keys: 'qaxq@a',
    want: 'c',
  },
  {
    title: 'Named storage with "',
    how: [
      'Press ", then a (the next deleted text goes to storage a).',
      'Press d twice (deletes the line).',
      'Press ", then a, then p (pastes storage a below the cursor line).',
    ],
    start: 'a\nb',
    keys: '"add"ap',
    want: 'b\na',
  },
  {
    title: 'Copy to the system clipboard',
    how: [
      'Press ", then + (selects the system clipboard).',
      'Press y twice (copies the line).',
      'Click inside the paste box below the editor and press Ctrl+V.',
    ],
    start: 'coin',
    keys: '"+yy',
    want: 'coin',
    paste: 'coin',
    browserOnly: true,
  },
  {
    title: 'Paste from the system clipboard',
    how: [
      'The page has just put the word coin on the clipboard.',
      'Press ", then + (selects the system clipboard).',
      'Press p (pastes after the cursor).',
      'If the browser asks for clipboard permission, allow it.',
    ],
    start: 'ab',
    keys: '"+p',
    want: 'acoinb',
    clipboard: 'coin',
    browserOnly: true,
  },
];
