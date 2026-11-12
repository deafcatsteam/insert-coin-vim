import { t, type TextKey } from '../i18n/i18n';
import type { Level } from '../levels/levels';
import { exportSave, importSave, loadSave } from '../progress/save';
import { displaySettings } from './display';
import { h, starRow } from './h';

/** Shows the title screen in `root`. */
export function showTitle(root: HTMLElement, onStart: () => void): void {
  const startEl = h('button', { type: 'button' }, t('title.start'));
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
      h('p', { className: 'ic-menu' }, startEl),
      h('p', {}, t('title.keyboard')),
      displaySettings(),
      h('p', { className: 'ic-small' }, t('title.footnote')),
    ),
  );
  startEl.addEventListener('click', onStart);
  // Enter starts, without the mouse.
  startEl.focus();
}

/** Shows the level list with the saved stars in `root`. */
export function showSelect(
  root: HTMLElement,
  levels: readonly Level[],
  onPick: (index: number) => void,
  message = '',
): void {
  const save = loadSave();
  const nodes: HTMLElement[] = [];
  const buttons: HTMLButtonElement[] = [];
  let list: HTMLElement | undefined;
  let chapter: number | undefined;
  let firstOpen: HTMLButtonElement | undefined;
  levels.forEach((level, index) => {
    if (level.chapter !== chapter) {
      chapter = level.chapter;
      list = h('ol');
      nodes.push(h('h2', {}, t('select.chapter', { chapter })), list);
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
      showSelect(root, levels, onPick, t(key));
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

  root.replaceChildren(
    h('h1', {}, t('select.title')),
    ...nodes,
    h(
      'p',
      {},
      exportEl,
      ' ',
      h('label', {}, t('select.import'), ' ', importEl),
    ),
    h('p', { role: 'status' }, message),
  );
  // Enter plays the first level the player has not finished.
  (firstOpen ?? buttons[0])?.focus();
}
