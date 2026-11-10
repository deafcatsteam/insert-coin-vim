import en from '../../locales/en.json';

/** A key of `locales/en.json`. A typo in the code is a type error. */
export type TextKey = keyof typeof en;

const messages: Record<string, string> = en;

/**
 * The player-facing text of a key. `{name}` is replaced by `vars.name`.
 * shortcut: English only; load `locales/<lang>.json` here when a second locale exists.
 */
export const t = (
  key: TextKey,
  vars: Record<string, string | number> = {},
): string =>
  (messages[key] ?? key).replace(/\{(\w+)\}/g, (hole, name: string) =>
    String(vars[name] ?? hole),
  );
