import en from '../../locales/en.json';

/** A key of `locales/en.json`. A typo in the code is a type error. */
export type TextKey = keyof typeof en;

/** Every `locales/<lang>.json`, by language tag. English is the reference. */
export const locales: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, string>>('../../locales/*.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, texts]) => [path.slice(path.lastIndexOf('/') + 1, -5), texts]),
);

const STORE = 'insert-coin-lang';

/** The locale for a browser tag: exact match first, then same base language (pt-PT gets pt-BR). */
export const match = (tag: string): string | undefined => {
  const codes = Object.keys(locales);
  const lower = tag.toLowerCase();
  return (
    codes.find((code) => code.toLowerCase() === lower) ??
    codes.find((code) => code.split('-')[0] === lower.split('-')[0])
  );
};

const saved = (): string | null => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};

/** The player's choice, else the browser languages, else English. */
export const lang: string =
  [saved(), ...(globalThis.navigator?.languages ?? [])]
    .map((tag) => (tag ? match(tag) : undefined))
    .find(Boolean) ?? 'en';

/** Saves the choice and reloads, so every screen is built again in that language. */
export const setLang = (code: string): void => {
  try {
    localStorage.setItem(STORE, code);
  } catch {
    // shortcut: storage blocked keeps the browser language; keep the choice in the URL if players ask.
  }
  location.reload();
};

// A key missing from a locale falls back to English.
const messages: Record<string, string> = { ...en, ...locales[lang] };

/** The player-facing text of a key. `{name}` is replaced by `vars.name`. */
export const t = (
  key: TextKey,
  vars: Record<string, string | number> = {},
): string =>
  (messages[key] ?? key).replace(/\{(\w+)\}/g, (hole, name: string) =>
    String(vars[name] ?? hole),
  );
