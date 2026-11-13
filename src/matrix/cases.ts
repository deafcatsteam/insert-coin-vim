/**
 * One row of the command support matrix (SPEC §6).
 * Motions are followed by an edit ("x", "dd") so that the buffer shows where the cursor went.
 * Expected buffers are hand-written from Vim's documented behaviour, not from a real Vim run.
 */
export interface Case {
  chapter: number;
  command: string;
  start: string;
  /** Cursor start as [line, column], both from 0. Default: [0, 0]. */
  cursor?: [number, number];
  keys: string;
  want: string;
}

// One row per line reads as a table.
// prettier-ignore
export const cases: Case[] = [
  // 0 — Boot
  { chapter: 0, command: 'i <Esc>', start: 'abc', keys: 'iX<Esc>x', want: 'abc' },
  { chapter: 0, command: 'h', start: 'abc', cursor: [0, 2], keys: 'hx', want: 'ac' },
  { chapter: 0, command: 'j', start: 'ab\ncd', keys: 'jx', want: 'ab\nd' },
  { chapter: 0, command: 'k', start: 'ab\ncd', cursor: [1, 0], keys: 'kx', want: 'b\ncd' },
  { chapter: 0, command: 'l', start: 'abc', keys: 'lx', want: 'ac' },
  // The game must intercept these (SPEC §13); here they only have to leave the buffer alone.
  { chapter: 0, command: ':w', start: 'abc', keys: ':w<CR>', want: 'abc' },
  { chapter: 0, command: ':q', start: 'abc', keys: ':q<CR>', want: 'abc' },
  { chapter: 0, command: ':wq', start: 'abc', keys: ':wq<CR>', want: 'abc' },
  { chapter: 0, command: ':q!', start: 'abc', keys: ':q!<CR>', want: 'abc' },

  // 1 — Basic edits
  { chapter: 1, command: 'x', start: 'abc', keys: 'x', want: 'bc' },
  { chapter: 1, command: 'dd', start: 'a\nb\nc', keys: 'dd', want: 'b\nc' },
  { chapter: 1, command: 'u', start: 'abc', keys: 'xu', want: 'abc' },
  { chapter: 1, command: '<C-r>', start: 'abc', keys: 'xu<C-r>', want: 'bc' },
  { chapter: 1, command: 'a', start: 'abc', keys: 'aX<Esc>', want: 'aXbc' },
  { chapter: 1, command: 'A', start: 'abc', keys: 'AX<Esc>', want: 'abcX' },
  { chapter: 1, command: 'I', start: '  abc', cursor: [0, 4], keys: 'IX<Esc>', want: '  Xabc' },
  { chapter: 1, command: 'o', start: 'a\nb', keys: 'oX<Esc>', want: 'a\nX\nb' },
  { chapter: 1, command: 'O', start: 'a\nb', keys: 'OX<Esc>', want: 'X\na\nb' },

  // 2 — Word motions
  { chapter: 2, command: 'w', start: 'foo.bar baz', keys: 'wx', want: 'foobar baz' },
  { chapter: 2, command: 'W', start: 'foo.bar baz', keys: 'Wx', want: 'foo.bar az' },
  { chapter: 2, command: 'e', start: 'foo.bar baz', keys: 'ex', want: 'fo.bar baz' },
  { chapter: 2, command: 'E', start: 'foo.bar baz', keys: 'Ex', want: 'foo.ba baz' },
  { chapter: 2, command: 'b', start: 'foo.bar baz', cursor: [0, 6], keys: 'bx', want: 'foo.ar baz' },
  { chapter: 2, command: 'B', start: 'foo.bar baz', cursor: [0, 6], keys: 'Bx', want: 'oo.bar baz' },
  { chapter: 2, command: '0', start: '  abc', cursor: [0, 4], keys: '0x', want: ' abc' },
  { chapter: 2, command: '^', start: '  abc', cursor: [0, 4], keys: '^x', want: '  bc' },
  { chapter: 2, command: '$', start: 'abc', keys: '$x', want: 'ab' },
  { chapter: 2, command: 'count + motion', start: 'a b c d', keys: '3wx', want: 'a b c ' },
  { chapter: 2, command: 'count + edit', start: 'abcde', keys: '3x', want: 'de' },

  // 3 — Grammar
  { chapter: 3, command: 'd + motion', start: 'foo bar', keys: 'dw', want: 'bar' },
  { chapter: 3, command: 'd$', start: 'foo bar', cursor: [0, 3], keys: 'd$', want: 'foo' },
  { chapter: 3, command: 'c + motion', start: 'foo bar', keys: 'cwX<Esc>', want: 'X bar' },
  { chapter: 3, command: 'yy p', start: 'a\nb', keys: 'yyp', want: 'a\na\nb' },
  { chapter: 3, command: 'y + motion, P', start: 'foo bar', keys: 'ywP', want: 'foo foo bar' },
  { chapter: 3, command: 'p (characters)', start: 'ab', keys: 'xp', want: 'ba' },
  { chapter: 3, command: '.', start: 'a b c d', keys: 'dw.', want: 'c d' },

  // 4 — Line jumps
  { chapter: 4, command: 'f', start: 'ab,cd,ef', keys: 'f,x', want: 'abcd,ef' },
  { chapter: 4, command: 't', start: 'ab,cd,ef', keys: 't,x', want: 'a,cd,ef' },
  { chapter: 4, command: 'F', start: 'ab,cd,ef', cursor: [0, 7], keys: 'F,x', want: 'ab,cdef' },
  { chapter: 4, command: 'T', start: 'ab,cd,ef', cursor: [0, 7], keys: 'T,x', want: 'ab,cd,f' },
  { chapter: 4, command: ';', start: 'ab,cd,ef', keys: 'f,;x', want: 'ab,cdef' },
  { chapter: 4, command: ',', start: 'ab,cd,ef', keys: 'f,;,x', want: 'abcd,ef' },
  { chapter: 4, command: 'gg', start: 'a\nb\nc', cursor: [2, 0], keys: 'ggdd', want: 'b\nc' },
  { chapter: 4, command: 'G', start: 'a\nb\nc', keys: 'Gdd', want: 'a\nb' },
  { chapter: 4, command: '{n}G', start: 'a\nb\nc', keys: '2Gdd', want: 'a\nc' },
  { chapter: 4, command: '%', start: '(a)b', keys: '%x', want: '(ab' },

  // 5 — Text objects
  { chapter: 5, command: 'iw', start: 'foo bar', cursor: [0, 1], keys: 'diw', want: ' bar' },
  { chapter: 5, command: 'aw', start: 'foo bar', cursor: [0, 1], keys: 'daw', want: 'bar' },
  { chapter: 5, command: 'i"', start: 'say "hi" ok', cursor: [0, 5], keys: 'di"', want: 'say "" ok' },
  { chapter: 5, command: 'a"', start: 'say "hi" ok', cursor: [0, 5], keys: 'da"', want: 'say ok' },
  { chapter: 5, command: 'i(', start: 'f(a, b)', cursor: [0, 3], keys: 'di(', want: 'f()' },
  { chapter: 5, command: 'a(', start: 'f(a, b)', cursor: [0, 3], keys: 'da(', want: 'f' },
  { chapter: 5, command: 'it', start: '<b>hi</b>', cursor: [0, 4], keys: 'dit', want: '<b></b>' },
  { chapter: 5, command: 'at', start: 'x<b>hi</b>', cursor: [0, 5], keys: 'dat', want: 'x' },
  { chapter: 5, command: 'ip', start: 'a\nb\n\nc', keys: 'dip', want: '\nc' },
  { chapter: 5, command: 'ap', start: 'a\nb\n\nc', keys: 'dap', want: 'c' },

  // 6 — Search
  { chapter: 6, command: '/', start: 'foo bar foo bar foo', keys: '/bar<CR>x', want: 'foo ar foo bar foo' },
  { chapter: 6, command: '?', start: 'foo bar foo bar foo', keys: '?bar<CR>x', want: 'foo bar foo ar foo' },
  { chapter: 6, command: 'n', start: 'foo bar foo bar foo', keys: '/bar<CR>nx', want: 'foo bar foo ar foo' },
  { chapter: 6, command: 'N', start: 'foo bar foo bar foo', keys: '/foo<CR>Nx', want: 'oo bar foo bar foo' },
  { chapter: 6, command: '*', start: 'foo bar foo bar foo', keys: '*x', want: 'foo bar oo bar foo' },
  { chapter: 6, command: '#', start: 'foo bar foo bar foo', keys: '#x', want: 'foo bar foo bar oo' },
  { chapter: 6, command: 'cgn', start: 'foo bar foo bar foo', keys: '/bar<CR>cgnX<Esc>', want: 'foo X foo bar foo' },
  { chapter: 6, command: 'cgn then .', start: 'foo bar foo bar foo', keys: '/bar<CR>cgnX<Esc>.', want: 'foo X foo X foo' },

  // 7 — Visual
  { chapter: 7, command: 'v', start: 'abcd', keys: 'vlld', want: 'd' },
  { chapter: 7, command: 'V', start: 'a\nb\nc', keys: 'Vjd', want: 'c' },
  { chapter: 7, command: '<C-v>', start: 'ab\ncd\nef', keys: '<C-v>jd', want: 'b\nd\nef' },
  { chapter: 7, command: 'block insert', start: 'ab\ncd\nef', keys: '<C-v>jIX<Esc>', want: 'Xab\nXcd\nef' },

  // 8 — Registers & marks ("+ needs the real clipboard: manual checklist)
  { chapter: 8, command: '"a', start: 'a\nb', keys: '"ayyj"ap', want: 'a\nb\na' },
  { chapter: 8, command: '"A (append)', start: 'a\nb', keys: '"ayyj"Ayy"ap', want: 'a\nb\na\nb' },
  { chapter: 8, command: '"0', start: 'a\nb', keys: 'yyjdd"0p', want: 'a\na' },
  { chapter: 8, command: "m '", start: 'a\nb\nc', keys: "majj'add", want: 'b\nc' },
  { chapter: 8, command: 'm `', start: 'abc\ndef', cursor: [0, 1], keys: 'maj`ax', want: 'ac\ndef' },

  // 9 — Macros
  { chapter: 9, command: 'q @', start: 'a\nb\nc', keys: 'qqA!<Esc>jq@q', want: 'a!\nb!\nc' },
  { chapter: 9, command: '@@', start: 'a\nb\nc', keys: 'qqA!<Esc>jq@q@@', want: 'a!\nb!\nc!' },
  { chapter: 9, command: 'count + macro', start: 'a\nb\nc\nd', keys: 'qqA!<Esc>jq2@q', want: 'a!\nb!\nc!\nd' },

  // 10 — Ex power
  { chapter: 10, command: ':s', start: 'a a', keys: ':s/a/b/<CR>', want: 'b a' },
  { chapter: 10, command: ':s with g flag', start: 'a a', keys: ':s/a/b/g<CR>', want: 'b b' },
  { chapter: 10, command: ':s regex \\d\\+', start: 'a1 b22', keys: ':s/\\d\\+/N/g<CR>', want: 'aN bN' },
  { chapter: 10, command: ':s groups \\(\\) \\1', start: 'ab', keys: ':s/\\(a\\)\\(b\\)/\\2\\1/<CR>', want: 'ba' },
  // The same two in JavaScript regex syntax, which the plugin uses by default.
  { chapter: 10, command: ':s regex \\d+ (JS syntax)', start: 'a1 b22', keys: ':s/\\d+/N/g<CR>', want: 'aN bN' },
  { chapter: 10, command: ':s groups () \\1 (JS syntax)', start: 'ab', keys: ':s/(a)(b)/\\2\\1/<CR>', want: 'ba' },
  { chapter: 10, command: ':s groups () $1 (JS syntax)', start: 'ab', keys: ':s/(a)(b)/$2$1/<CR>', want: 'ba' },
  { chapter: 10, command: ':%s', start: 'x\nx\nx', keys: ':%s/x/y/<CR>', want: 'y\ny\ny' },
  { chapter: 10, command: 'range :2,3s', start: 'x\nx\nx', keys: ':2,3s/x/y/<CR>', want: 'x\ny\ny' },
  { chapter: 10, command: ':g', start: 'a\nb\na', keys: ':g/a/d<CR>', want: 'b' },
  { chapter: 10, command: ':norm', start: 'a\nb', keys: ':%norm A!<CR>', want: 'a!\nb!' },
  // Below: added by the game (src/engine/ex.ts), or relied on by chapter 10 levels.
  { chapter: 10, command: ':s & in replacement', start: 'ab', keys: ':s/b/[&]/<CR>', want: 'a[b]' },
  { chapter: 10, command: ':s \\d', start: 'a1b2', keys: ':s/\\d/N/g<CR>', want: 'aNbN' },
  { chapter: 10, command: ':v', start: 'a\nb\na', keys: ':v/a/d<CR>', want: 'a\na' },
  { chapter: 10, command: ':g norm', start: 'a\nb\na', keys: ':g/a/norm A!<CR>', want: 'a!\nb\na!' },
  { chapter: 10, command: 'visual range :s', start: 'x\nx\nx', keys: 'Vj:s/x/y/<CR>', want: 'y\ny\nx' },
  { chapter: 10, command: ':m down', start: 'a\nb\nc', keys: ':m2<CR>', want: 'b\na\nc' },
  { chapter: 10, command: ':m0', start: 'a\nb\nc', cursor: [2, 0], keys: ':m0<CR>', want: 'c\na\nb' },
  { chapter: 10, command: ':m$ (range)', start: 'a\nb\nc\n', keys: ':1,2m$<CR>', want: 'c\na\nb\n' },
  { chapter: 10, command: ':m-2', start: 'a\nb\nc', cursor: [2, 0], keys: ':m-2<CR>', want: 'a\nc\nb' },
  { chapter: 10, command: ':g/^/m0', start: 'a\nb\nc\n', keys: ':g/^/m0<CR>', want: 'c\nb\na\n' },
  { chapter: 10, command: ':t.', start: 'a\nb', keys: ':t.<CR>', want: 'a\na\nb' },
  { chapter: 10, command: ':t0', start: 'a\nb', cursor: [1, 0], keys: ':t0<CR>', want: 'b\na\nb' },
  { chapter: 10, command: ':co$ (range)', start: 'a\nb\nc\n', keys: ':1,2co$<CR>', want: 'a\nb\nc\na\nb\n' },
  { chapter: 10, command: ':m then x (cursor)', start: 'a\n  b\nc', cursor: [1, 0], keys: ':m0<CR>x', want: '  \na\nc' },
  { chapter: 10, command: ':m then u', start: 'a\nb\nc', keys: ':m$<CR>u', want: 'a\nb\nc' },
  { chapter: 10, command: ':5 still jumps', start: 'a\nb\nc', keys: ':3<CR>x', want: 'a\nb\n' },
];
