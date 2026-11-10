import { getCM, vim } from '@replit/codemirror-vim';
import { basicSetup, EditorView } from 'codemirror';

const parent = document.querySelector('#app');
const logEl = document.querySelector('#log');
const modeEl = document.querySelector('#mode');
if (!parent || !logEl || !modeEl) throw new Error('playground markup missing');

const view = new EditorView({
  doc: 'const a = 1;\nconst b = 2;',
  // vim() must come before basicSetup so its keymap takes precedence.
  extensions: [vim(), basicSetup],
  parent,
});

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

// Every key the Vim layer receives, in Vim notation (also in insert mode).
cm.on('inputEvent', (e: { type: string; key?: string }) => {
  if (e.type === 'handleKey' && e.key) log('vim', e.key);
});

// Only keys Vim consumed itself; plain insert-mode typing is absent here.
cm.on('vim-keypress', (key: string) => log('handled', key));

cm.on('vim-mode-change', (e: { mode: string; subMode?: string }) => {
  modeEl.textContent = e.subMode ? `${e.mode} (${e.subMode})` : e.mode;
});

view.focus();
