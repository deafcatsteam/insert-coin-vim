import { lang, locales, setLang, t } from '../i18n/i18n';
import { h } from './h';

/** The language menu of the title screen. Each language shows its own name. */
export function languageSetting(): HTMLElement {
  const menu = h(
    'select',
    {},
    ...Object.entries(locales)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, texts]) =>
        h(
          'option',
          { value: code, selected: code === lang, lang: code },
          texts['lang.name'] ?? code,
        ),
      ),
  );
  menu.addEventListener('change', () => {
    setLang(menu.value);
  });
  return h('p', {}, h('label', {}, t('lang.label'), ' ', menu));
}
