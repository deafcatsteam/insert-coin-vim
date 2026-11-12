import { Decoration, EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * The one span where two texts differ: `a.slice(from, toA)` against `b.slice(from, toB)`.
 * One final newline is ignored, as in `matches`.
 * shortcut: two separate edits give one span from the first to the last; use a real
 * line diff when levels with distant edits read badly.
 */
export function diffSpan(
  a: string,
  b: string,
): { from: number; toA: number; toB: number } {
  let toA = a.endsWith('\n') ? a.length - 1 : a.length;
  let toB = b.endsWith('\n') ? b.length - 1 : b.length;
  let from = 0;
  while (from < toA && from < toB && a[from] === b[from]) from++;
  while (toA > from && toB > from && a[toA - 1] === b[toB - 1]) {
    toA--;
    toB--;
  }
  return { from, toA, toB };
}

const mark = Decoration.mark({ class: 'ic-diff' });

/** Marks, in the editor, the part of the buffer that differs from the target. */
export const diffHighlight = (target: string): Extension =>
  EditorView.decorations.compute(['doc'], (state) => {
    const { from, toA } = diffSpan(state.doc.toString(), target);
    return from < toA
      ? Decoration.set([mark.range(from, toA)])
      : Decoration.none;
  });
