import { Vim } from '@replit/codemirror-vim';

// The plugin has no ":m", ":t" or ":co" (Phase 0 matrix). These follow Vim's
// ":help :move" and ":help :copy" on whole lines.
// shortcut: the address takes a line number, ".", "$" and +/- offsets only, no marks
// or patterns, and a bad one does nothing instead of showing an error; extend when a level needs it.

type ExFn = Parameters<typeof Vim.defineEx>[2];
type Cm = Parameters<ExFn>[0];

/** Last line of the text. A buffer that ends in "\n" has an empty line after it, which is not text. */
const lastLine = (cm: Cm): number => {
  const last = cm.lastLine();
  return last > 0 && cm.getLine(last) === '' ? last - 1 : last;
};

/** The line the text goes below, from 0; -1 is above the first line. */
const address = (cm: Cm, arg: string | undefined): number | undefined => {
  const m = /^\s*(\d+|[.$])?((?:[+-]\d*)*)\s*$/.exec(arg ?? '');
  if (!m?.[0].trim()) return undefined;
  const [, base, offsets = ''] = m;
  let line =
    base === '$'
      ? lastLine(cm) + 1
      : base && base !== '.'
        ? Number(base)
        : cm.getCursor().line + 1;
  for (const [, sign, count] of offsets.matchAll(/([+-])(\d*)/g))
    line += (sign === '+' ? 1 : -1) * Number(count || 1);
  line -= 1;
  return line >= -1 && line <= lastLine(cm) ? line : undefined;
};

/** The command's lines, from 0, or undefined when none of them is text. */
const range = (
  cm: Cm,
  params: { selectionLine: number; selectionLineEnd?: number },
): [number, number] | undefined => {
  const a = params.selectionLine;
  const b = params.selectionLineEnd ?? a;
  const first = Math.min(a, b);
  const last = Math.min(Math.max(a, b), lastLine(cm));
  return first <= last ? [first, last] : undefined;
};

const lines = (cm: Cm, from: number, to: number): string[] => {
  const out: string[] = [];
  for (let i = from; i <= to; i++) out.push(cm.getLine(i));
  return out;
};

/** Vim leaves the cursor on the last line it moved or copied, at its first non-blank. */
const land = (cm: Cm, line: number): void => {
  cm.setCursor({ line, ch: /\S|$/.exec(cm.getLine(line))?.index ?? 0 });
};

const move: ExFn = (cm, params) => {
  const span = range(cm, params);
  const dest = address(cm, params.argString);
  if (!span || dest === undefined) return;
  const [a, b] = span;
  // Into itself is an error in Vim; right above or below itself changes nothing.
  if (dest >= a - 1 && dest <= b) return;
  const block = lines(cm, a, b);
  const [from, to, text] =
    dest < a
      ? [dest + 1, b, [...block, ...lines(cm, dest + 1, a - 1)]]
      : [a, dest, [...lines(cm, b + 1, dest), ...block]];
  cm.replaceRange(
    text.join('\n'),
    { line: from, ch: 0 },
    { line: to, ch: cm.getLine(to).length },
  );
  land(cm, dest < a ? dest + 1 + b - a : dest);
};

const copy: ExFn = (cm, params) => {
  const span = range(cm, params);
  const dest = address(cm, params.argString);
  if (!span || dest === undefined) return;
  const [a, b] = span;
  const text = lines(cm, a, b).join('\n');
  if (dest < 0) cm.replaceRange(`${text}\n`, { line: 0, ch: 0 });
  else {
    const end = { line: dest, ch: cm.getLine(dest).length };
    cm.replaceRange(`\n${text}`, end, end);
  }
  land(cm, dest + 1 + b - a);
};

/** The plugin reads a command name as letters and digits, so ":m0" asks for a command "m0". */
const withNumber =
  (fn: ExFn): ExFn =>
  (cm, params) => {
    const number = /\d+$/.exec(params.commandName)?.[0] ?? '';
    fn(cm, { ...params, argString: number + (params.argString ?? '') });
  };

// "move" is taken: the plugin runs it for a line number alone, as in ":5".
// shortcut: so ":move" in full is not a command, only ":m", ":mo" and ":mov".
Vim.defineEx('mov', 'm', move);
Vim.defineEx('t', 't', copy);
Vim.defineEx('copy', 'co', copy);
// shortcut: a line number glued to the command works up to 999; ":m 1000" needs the space.
for (let n = 0; n < 1000; n++) {
  Vim.defineEx(`m${String(n)}`, undefined, withNumber(move));
  Vim.defineEx(`t${String(n)}`, undefined, withNumber(copy));
  Vim.defineEx(`co${String(n)}`, undefined, withNumber(copy));
}
