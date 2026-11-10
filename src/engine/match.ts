// Vim always ends a file with a newline; level authors may or may not write it.
const stripFinalNewline = (text: string): string => text.replace(/\n$/, '');

/** Exact comparison of the buffer with the level target, ignoring one final newline. */
export const matches = (buffer: string, target: string): boolean =>
  stripFinalNewline(buffer) === stripFinalNewline(target);
