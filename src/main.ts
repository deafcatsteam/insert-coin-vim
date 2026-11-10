import { getCM } from '@replit/codemirror-vim';
import { createSession, type Session } from './engine/session';
import { parseKeys } from './scoring/keys';

// Developer playground for the level engine. The game screens replace it later in Phase 1.
const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const found = document.querySelector<T>(`#${id}`);
  if (!found) throw new Error(`playground markup missing: ${id}`);
  return found;
};
const appEl = el('app');
const targetEl = el<HTMLTextAreaElement>('target');
const forbiddenEl = el<HTMLInputElement>('forbidden');
const statusEl = el('status');
const modeEl = el('mode');
const countEl = el('count');
const faultsEl = el('faults');
const keysEl = el('keys');

targetEl.value = '  ne two\nthree';
let session: Session | undefined;

const show = (): void => {
  if (!session) return;
  statusEl.textContent = session.done
    ? `complete in ${String(session.keys.length)} keys, editor frozen`
    : 'no match';
  countEl.textContent = String(session.keys.length);
  faultsEl.textContent = String(session.faults);
  keysEl.textContent = session.keys.join('');
};

const start = (): void => {
  session?.destroy();
  session = createSession(
    appEl,
    {
      start: '  one two\nthree',
      target: targetEl.value,
      forbiddenKeys: parseKeys(forbiddenEl.value),
    },
    show,
  );
  modeEl.textContent = 'normal';
  getCM(session.view)?.on(
    'vim-mode-change',
    (e: { mode: string; subMode?: string }) => {
      modeEl.textContent = e.subMode ? `${e.mode} (${e.subMode})` : e.mode;
    },
  );
  show();
};

el('reset').addEventListener('click', () => {
  start();
  session?.view.focus();
});
targetEl.addEventListener('change', start);
forbiddenEl.addEventListener('change', start);

start();
session?.view.focus();
