const NAMED =
  'Esc|CR|BS|Tab|Space|lt|Del|Up|Down|Left|Right|Home|End|PageUp|PageDown|Insert';

// Only known key names form a <...> token, so literal text such as "<div>" stays 5 keys.
const TOKEN = new RegExp(
  `<(?:[CSAMD]-)+(?:${NAMED}|.)>|<(?:${NAMED})>|.`,
  'gsu',
);

/**
 * Splits a solution written in Vim notation into single keystrokes.
 * The array length is the VimGolf score: every key counts once, chords included.
 */
export const parseKeys = (notation: string): string[] =>
  notation.match(TOKEN) ?? [];
