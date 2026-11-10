import { getCM, vim } from '@replit/codemirror-vim';
import { basicSetup, EditorView } from 'codemirror';
import { matches } from './engine/match';
import { createRecorder } from './engine/recorder';
import { parseKeys } from './scoring/keys';

const parent = document.querySelector('#app');
const logEl = document.querySelector('#log');
const modeEl = document.querySelector('#mode');
const countEl = document.querySelector('#count');
const keysEl = document.querySelector('#keys');
const resetEl = document.querySelector('#reset');
const forbiddenEl = document.querySelector<HTMLInputElement>('#forbidden');
const targetEl = document.querySelector<HTMLTextAreaElement>('#target');
const statusEl = document.querySelector('#status');
if (
  !targetEl ||
  !statusEl ||
  !parent ||
  !logEl ||
  !modeEl ||
  !countEl ||
  !keysEl ||
  !resetEl ||
  !forbiddenEl
)
  throw new Error('playground markup missing');

const view = new EditorView({
  doc: 'const a = 1;\nconst b = 2;',
  // vim() must come before basicSetup so its keymap takes precedence.
  extensions: [
    vim(),
    basicSetup,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) showStatus();
    }),
  ],
  parent,
});
targetEl.value = 'const b = 2;\n';

const cm = getCM(view);
if (!cm) throw new Error('vim adapter not attached');

const lines: string[] = [];
const log = (source: string, text: string): void => {
  lines.unshift(`${source.padEnd(8)}${text}`);
  lines.length = Math.min(lines.length, 200);
  logEl.textContent = lines.join('\n');
};

// Raw browser event, before Vim sees it: shows what the keyboard layout sends.
window.addEventListener(
  'keydown',
  (e) => {
    const mods = [
      e.ctrlKey && 'ctrl',
      e.altKey && 'alt',
      e.shiftKey && 'shift',
      e.metaKey && 'meta',
    ].filter(Boolean);
    log('keydown', `${JSON.stringify(e.key)} ${mods.join('+')}`);
  },
  true,
);

// Checked on every buffer change and every key, so completion shows in any mode.
const showStatus = (): void => {
  statusEl.textContent = matches(view.state.doc.toString(), targetEl.value)
    ? `complete in ${String(recorder.keys.length)} keys`
    : 'no match';
};

const showKeys = (): void => {
  countEl.textContent = String(recorder.keys.length);
  keysEl.textContent = recorder.keys.join('');
  showStatus();
};

// Every key the Vim layer receives, in Vim notation (also in insert mode).
const recorder = createRecorder(view, (key, blocked) => {
  log(blocked ? 'blocked' : 'vim', key);
  showKeys();
});

resetEl.addEventListener('click', () => {
  recorder.reset();
  showKeys();
  view.focus();
});

forbiddenEl.addEventListener('input', () => {
  recorder.forbidden = new Set(parseKeys(forbiddenEl.value));
});

// Only keys Vim consumed itself; plain insert-mode typing is absent here.
cm.on('vim-keypress', (key: string) => log('handled', key));

cm.on('vim-mode-change', (e: { mode: string; subMode?: string }) => {
  modeEl.textContent = e.subMode ? `${e.mode} (${e.subMode})` : e.mode;
});

targetEl.addEventListener('input', showStatus);
showStatus();

view.focus();
