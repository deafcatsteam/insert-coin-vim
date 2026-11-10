import { EditorState } from '@codemirror/state';
import { Vim, vim } from '@replit/codemirror-vim';
import { EditorView, minimalSetup } from 'codemirror';
import { createRecorder, type Recorder } from './engine/recorder';
import { steps } from './manual-steps';

const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const found = document.querySelector<T>(`#${id}`);
  if (!found) throw new Error(`manual markup missing: ${id}`);
  return found;
};
const titleEl = el('title');
const howEl = el('how');
const appEl = el('app');
const wantEl = el('want');
const pasteRowEl = el('paste-row');
const pasteEl = el<HTMLTextAreaElement>('paste');
const statusEl = el('status');
const keysEl = el('keys');
const reportEl = el('report');

/** Survives a reload or a closed tab, so a shortcut the browser keeps still leaves a trace. */
interface Saved {
  step: number;
  report: string[];
  /** Raw keydowns and window events of the step in progress. */
  raw: string[];
  display: string;
}
const STORE = 'insert-coin-manual';
const state = (JSON.parse(
  localStorage.getItem(STORE) ?? 'null',
) as Saved | null) ?? { step: 0, report: [], raw: [], display: 'window' };

let view: EditorView | undefined;
let recorder: Recorder | undefined;
let locked = false;

const display = (): string => {
  if (!document.fullscreenElement) return 'window';
  return locked ? 'fullscreen+lock' : 'fullscreen';
};
const save = (): void => {
  state.display = display();
  localStorage.setItem(STORE, JSON.stringify(state));
};
const note = (text: string): void => {
  state.raw.push(text);
  save();
};

const label = (): string =>
  `${String(state.step + 1).padStart(2, '0')} ${steps[state.step]?.title ?? ''}`;
const reportText = (): string =>
  [navigator.userAgent, ...state.report].join('\n');

const passed = (): boolean => {
  const step = steps[state.step];
  return (
    !!step &&
    view?.state.doc.toString() === step.want &&
    (step.paste === undefined || pasteEl.value.trim() === step.paste)
  );
};

const show = (): void => {
  if (steps[state.step])
    statusEl.textContent = passed() ? 'PASS, click "Next step"' : 'not yet';
  keysEl.textContent = recorder?.keys.join(' ') ?? '';
  reportEl.textContent = reportText();
};

const load = (): void => {
  recorder?.destroy();
  view?.destroy();
  recorder = view = undefined;
  // Vim keeps macro recording and registers across editors: a failed step must not break the next.
  Vim.resetVimGlobalState_();
  state.raw = [];
  save();
  pasteEl.value = '';

  const step = steps[state.step];
  if (!step) {
    titleEl.textContent = 'All steps done';
    howEl.replaceChildren();
    wantEl.textContent = '';
    pasteRowEl.hidden = true;
    statusEl.textContent = 'click "Copy report" and paste it to the reviewer';
    show();
    return;
  }
  titleEl.textContent = `Step ${String(state.step + 1)} of ${String(steps.length)}: ${step.title}`;
  howEl.replaceChildren(
    ...step.how.map((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }),
  );
  wantEl.textContent = step.want;
  pasteRowEl.hidden = step.paste === undefined;

  // Same editor setup as the headless replay, so both see the same Vim.
  view = new EditorView({
    doc: step.start,
    extensions: [
      vim(),
      minimalSetup,
      EditorState.allowMultipleSelections.of(true),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) show();
      }),
    ],
    parent: appEl,
  });
  const [line, ch] = step.cursor ?? [0, 0];
  view.dispatch({
    selection: { anchor: view.state.doc.line(line + 1).from + ch },
  });
  recorder = createRecorder(view, show);
  if (step.clipboard !== undefined)
    navigator.clipboard.writeText(step.clipboard).catch(() => {
      note('[clipboard write refused]');
    });
  view.focus();
  show();
};

const MODIFIERS = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta'];
// Raw browser event, before Vim sees it: shows what the keyboard layout sends.
window.addEventListener(
  'keydown',
  (e) => {
    if (MODIFIERS.includes(e.key)) return;
    const mods = [
      e.ctrlKey && 'ctrl',
      e.altKey && 'alt',
      e.shiftKey && 'shift',
      e.metaKey && 'meta',
    ].filter(Boolean);
    note([...mods, e.key === ' ' ? 'Space' : e.key].join('+'));
  },
  true,
);
// Signs that the browser kept a shortcut for itself.
window.addEventListener('blur', () => {
  note('[window lost focus]');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) note('[page hidden]');
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) return;
  locked = false;
  note('[fullscreen ended]');
});
pasteEl.addEventListener('input', show);

const on = (id: string, action: () => void): void => {
  el(id).addEventListener('click', () => {
    action();
    view?.focus();
  });
};
on('next', () => {
  if (steps[state.step]) {
    state.report.push(
      [
        `[${display()}] ${label()}: ${passed() ? 'PASS' : 'FAIL'}`,
        `vim: ${recorder?.keys.join(' ') ?? ''}`,
        `raw: ${state.raw.join(' ')}`,
        `buffer: ${JSON.stringify(view?.state.doc.toString())}`,
      ].join(' | '),
    );
    state.step++;
  }
  load();
});
on('redo', load);
on('restart', () => {
  state.step = 0;
  load();
});
on('clear', () => {
  state.report = [];
  save();
  show();
});
on('copy', () => {
  void navigator.clipboard.writeText(reportText());
});

const fullscreen = (lock: boolean): void => {
  // Keyboard Lock is Chromium-only and missing from the DOM typings.
  const keyboard = (
    navigator as Navigator & { keyboard?: { lock(): Promise<void> } }
  ).keyboard;
  document.documentElement
    .requestFullscreen()
    .then(async () => {
      if (!lock) return;
      if (!keyboard) throw new Error('keyboard lock not supported');
      await keyboard.lock();
      locked = true;
    })
    .catch((error: unknown) => {
      note(`[${String(error)}]`);
    })
    .finally(() => view?.focus());
};
on('full', () => {
  fullscreen(false);
});
on('lock', () => {
  fullscreen(true);
});

// Keys were pressed in a step that never finished: the page was closed or reloaded.
if (state.raw.some((entry) => !/^\[.+\]$/.test(entry))) {
  state.report.push(
    `[${state.display}] ${label()}: PAGE CLOSED OR RELOADED | raw: ${state.raw.join(' ')}`,
  );
  state.step++;
}
load();
