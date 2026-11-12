import { t } from '../i18n/i18n';

/** Creates an element with properties and children. The screens have no framework. */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] => {
  const element = Object.assign(document.createElement(tag), props);
  element.append(...children);
  return element;
};

/** Stars out of three. A screen reader says the label, not the star glyphs. */
export const starRow = (count: number): HTMLElement =>
  h(
    'span',
    { role: 'img', ariaLabel: t('results.stars', { count }) },
    '★'.repeat(count) + '☆'.repeat(3 - count),
  );

/** The status strip at the top of the dashboard screens. Decoration only. */
export const strip = (): HTMLElement =>
  h(
    'p',
    { className: 'ic-strip', ariaHidden: 'true' },
    h('span', {}, t('strip.sys')),
    h('span', {}, t('strip.operator')),
    h('span', {}, t('strip.mem')),
  );
