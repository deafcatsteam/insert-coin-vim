import { t, type TextKey } from '../i18n/i18n';
import type { Level } from '../levels/levels';
import { exportSave, importSave, loadSave } from '../progress/save';
import { displaySettings } from './display';
import { h, starRow, strip } from './h';
import { languageSetting } from './language';
import { clock } from './results';
import { soundSetting } from './sound';

/** Pause between two lines of the boot text. */
const BOOT_LINE_MS = 350;

/** Shows the boot text in `root`, then calls `onDone`. Any key or click skips it. */
export function showBoot(root: HTMLElement, onDone: () => void): void {
  const lines = t('boot.lines').split('\n');
  root.replaceChildren(
    h(
      'div',
      { className: 'ic-boot' },
      ...lines.map((line, i) => {
        const el = h('p', {}, line);
        el.style.animationDelay = `${i * BOOT_LINE_MS}ms`;
        return el;
      }),
      h('p', { className: 'ic-small' }, t('boot.skip')),
    ),
  );
  const end = (e?: Event): void => {
    // The key that skips must not also press a button of the next screen.
    e?.preventDefault();
    clearTimeout(timer);
    window.removeEventListener('keydown', end);
    window.removeEventListener('pointerdown', end);
    onDone();
  };
  const timer = setTimeout(end, (lines.length + 2) * BOOT_LINE_MS);
  window.addEventListener('keydown', end);
  window.addEventListener('pointerdown', end);
}

/** Shows the title screen in `root`. `toReview`: levels in the review queue today. */
export function showTitle(
  root: HTMLElement,
  onStart: () => void,
  onDaily: () => void,
  onReview: () => void,
  toReview: number,
): void {
  const startEl = h('button', { type: 'button' }, t('title.start'));
  const dailyEl = h('button', { type: 'button' }, t('title.daily'));
  const reviewEl = h(
    'button',
    { type: 'button' },
    t('title.review', { count: toReview }),
  );
  root.replaceChildren(
    h(
      'div',
      { className: 'ic-title' },
      h(
        'p',
        { className: 'ic-corp' },
        h('span', { className: 'ic-logo', ariaHidden: 'true' }),
        ' ',
        t('corp.name'),
      ),
      h('p', {}, t('title.program')),
      h('h1', { className: 'ic-coin' }, t('title.name')),
      h('p', { className: 'ic-menu' }, startEl, ' ', dailyEl, ' ', reviewEl),
      h('p', {}, t('title.keyboard')),
      displaySettings(),
      soundSetting(),
      languageSetting(),
      h('p', { className: 'ic-small' }, t('title.footnote')),
    ),
  );
  startEl.addEventListener('click', onStart);
  dailyEl.addEventListener('click', onDaily);
  reviewEl.addEventListener('click', onReview);
  // Enter starts, without the mouse.
  startEl.focus();
}

/**
 * Shows the level list with the saved stars in `root`. `onBack`: Title button and Escape.
 * `onRun` starts the Speedrun of a chapter, offered once every level of it is done.
 */
export function showSelect(
  root: HTMLElement,
  levels: readonly Level[],
  onPick: (index: number) => void,
  onBack: () => void,
  message = '',
  onRun?: (chapter: number) => void,
): void {
  const save = loadSave();
  const nodes: HTMLElement[] = [];
  const buttons: HTMLButtonElement[] = [];
  let list: HTMLElement | undefined;
  let chapter: number | undefined;
  let firstOpen: HTMLButtonElement | undefined;
  levels.forEach((level, index) => {
    if (level.chapter !== chapter) {
      const current = (chapter = level.chapter);
      list = h('ol');
      nodes.push(h('h2', {}, t('select.chapter', { chapter })));
      const done = levels
        .filter((l) => l.chapter === current)
        .every((l) => save.levels[l.id]);
      if (onRun && done) {
        const best = save.speedrun?.[current];
        const runEl = h(
          'button',
          { type: 'button' },
          best
            ? t('select.speedrunBest', { time: clock(best.ms, true) })
            : t('select.speedrun'),
        );
        runEl.addEventListener('click', () => {
          onRun(current);
        });
        nodes.push(h('p', {}, runEl));
      }
      nodes.push(list);
    }
    const best = save.levels[level.id];
    const button = h(
      'button',
      { type: 'button' },
      t(level.title.key as TextKey),
      ' ',
      starRow(best?.stars ?? 0),
    );
    button.addEventListener('click', () => {
      onPick(index);
    });
    if (!best) firstOpen ??= button;
    buttons.push(button);
    list?.append(h('li', {}, button));
  });

  const exportEl = h('button', { type: 'button' }, t('select.export'));
  exportEl.addEventListener('click', () => {
    const url = URL.createObjectURL(
      new Blob([exportSave()], { type: 'application/json' }),
    );
    h('a', { href: url, download: 'insert-coin-save.json' }).click();
    URL.revokeObjectURL(url);
  });
  const importEl = h('input', { type: 'file', accept: '.json' });
  importEl.addEventListener('change', () => {
    const again = (key: TextKey): void => {
      showSelect(root, levels, onPick, onBack, t(key), onRun);
    };
    importEl.files?.[0]
      ?.text()
      .then(importSave)
      .then(
        () => {
          again('select.imported');
        },
        () => {
          again('select.badFile');
        },
      );
  });

  const backEl = h('button', { type: 'button' }, t('nav.title'));
  backEl.addEventListener('click', onBack);
  const screen = h(
    'div',
    { className: 'ic-select' },
    strip(),
    h(
      'header',
      { className: 'ic-head' },
      h('h1', {}, t('select.title')),
      backEl,
    ),
    ...nodes,
    h(
      'p',
      { className: 'ic-actions' },
      exportEl,
      ' ',
      h('label', {}, t('select.import'), ' ', importEl),
    ),
    h('p', { role: 'status' }, message),
  );
  // On the screen, not the window: the listener goes away with the screen.
  screen.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onBack();
  });
  root.replaceChildren(screen);
  // Enter plays the first level the player has not finished.
  (firstOpen ?? buttons[0])?.focus();
}
