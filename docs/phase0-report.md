# Phase 0 report

Phase 0 (SPEC §12) asks one question: what can the browser really do with Vim keys?
This report gives the answer, the limits of what was tested, and what to decide before Phase 1.

## Summary

- The technical base works: CodeMirror 6 with `@replit/codemirror-vim` runs in Vite, keystrokes
  are recorded and counted, completion is detected, and a solution string can be replayed
  without a browser.
- The Vim emulation is good: 81 of 87 tested commands behave as expected. The MVP chapters
  (0 to 3) have no failure.
- Three shortcuts never reach the page in a normal browser window: `Ctrl+N`, `Ctrl+T`, `Ctrl+W`.
  `Ctrl+R` and `Ctrl+V` work.
- On an AZERTY keyboard, the dead keys `^` and `` ` `` only work when followed by Space.
  Without Space they do the wrong thing, silently.
- Manual testing is incomplete: one browser (Zen, a Firefox fork), window mode, AZERTY, Windows.
  Chrome, Edge, fullscreen, QWERTZ and QWERTY were not tested.

## Status of the Phase 0 list

| SPEC §12 item                                  | Status  | Where                                              |
| ---------------------------------------------- | ------- | -------------------------------------------------- |
| CodeMirror 6 + vim mode in Vite                | done    | `index.html`, `src/main.ts`                        |
| Support matrix for every command in §6         | done    | `docs/support-matrix.md`, `npm run matrix`         |
| Keystroke recorder + VimGolf-style counter     | done    | `src/engine/recorder.ts`, `src/scoring/keys.ts`    |
| Buffer vs target + completion detection        | done    | `src/engine/match.ts`                              |
| Headless replay of a solution string           | done    | `src/engine/replay.ts`, `levels/sample/`           |
| Browser-reserved shortcuts (3 browsers, 2 modes) | partial | one Gecko browser, window mode only              |
| Layout tests (AZERTY, QWERTZ, QWERTY, dead keys) | partial | AZERTY only                                      |
| Recommendation                                 | done    | this report                                        |

Automated checks at the time of writing: lint clean, typecheck clean, 56 tests pass in 8 files.

## Command support

Source: `docs/support-matrix.md`. Each row replays keys headless (jsdom) and compares the buffer.
The expected buffers were written by hand from the Vim documentation. No real Vim was available
to confirm them.

| Chapter               | Rows ok  | What fails                                                    |
| --------------------- | -------- | ------------------------------------------------------------- |
| 0 Boot                | 9 of 9   |                                                               |
| 1 Basic edits         | 9 of 9   |                                                               |
| 2 Word motions        | 11 of 11 |                                                               |
| 3 Grammar             | 7 of 7   |                                                               |
| 4 Line jumps          | 10 of 10 |                                                               |
| 5 Text objects        | 7 of 10  | `it` and `at` do nothing; `da"` leaves two spaces, Vim leaves one |
| 6 Search              | 8 of 8   |                                                               |
| 7 Visual              | 4 of 4   |                                                               |
| 8 Registers and marks | 5 of 5   | `"+` is not in the matrix, see below                          |
| 9 Macros              | 3 of 3   |                                                               |
| 10 Ex power           | 8 of 11  | `:s` uses JavaScript regex syntax, not Vim syntax             |

Details on chapter 10: `:s/\d\+/N/g` and `:s/\(a\)\(b\)/\2\1/` do nothing. The JavaScript forms
`:s/\d+/N/g` and `:s/(a)(b)/$2$1/` work. A player who learns these forms learns something that
is wrong in real Vim.

`:w`, `:q`, `:wq` and `:q!` can be intercepted with `Vim.defineEx`, so the game decides what they
do (`src/engine/ex.test.ts`).

Not testable headless: `gj` and `gk` (they need real layout). They are not in §6.

## Browser-reserved shortcuts

Tested in Zen (Gecko engine, reports itself as Firefox 159), Windows, window mode.

| Shortcut | Vim use                        | Result                                   | Fallback in the game           |
| -------- | ------------------------------ | ---------------------------------------- | ------------------------------ |
| `Esc`    | leave insert mode              | works                                    |                                |
| `Ctrl+R` | redo                           | works                                    |                                |
| `Ctrl+V` | visual block                   | works                                    |                                |
| `Ctrl+N` | next line / completion         | kept by the browser: opens a new window  | not needed, `j` does the same  |
| `Ctrl+T` | indent in insert mode          | kept by the browser: opens a new tab     | do not use in levels           |
| `Ctrl+W` | delete word in insert mode     | kept by the browser: **closes the tab**  | do not use in levels           |

For the three kept shortcuts the page receives no key event at all, so the game cannot block
them or react to them. `Ctrl+W` closes the game. None of the three is in the §6 curriculum.

Not tested: Chrome, Edge, real Firefox, fullscreen, and fullscreen with Keyboard Lock (a Chromium
feature that may give `Ctrl+W`, `Ctrl+T` and `Ctrl+N` to the page). Zen may set its shortcuts
differently from Firefox.

## Keyboard layouts

Tested with an AZERTY keyboard in the same browser.

Works: all symbols `{}[]()<>|\/#@$%&*+-=_.,;:!?"'`, including the ones typed with AltGr; digits;
`.`; `/` search; `:` command line; `}`; `@` macros; `"` registers; `~` followed by Space.

Dead keys (`^` and `` ` `` wait for the next key to build an accented letter):

| Keys pressed                | What happens                                                        |
| --------------------------- | ------------------------------------------------------------------- |
| `^` then Space              | works: Vim gets `^`                                                 |
| `^` then a letter           | broken: the text `^x` is written into the buffer, in normal mode    |
| `` ` `` then Space          | works: Vim gets `` ` ``                                             |
| `` ` `` then `a`            | broken: the browser sends `à`, the plugin turns it into `q`, which starts recording a macro |
| two dead keys in a row      | recorded as one fake key such as `<^~>`                             |

Cause of the `à` case: for a key outside ASCII, the plugin does not use the character. It uses the
physical position of the key as if the keyboard were QWERTY (`vim.js`, line 1243). Reading the
code, the same rule should apply to `é`, `è`, `ç` and `ù` in normal mode; this was not tested.

Consequences: `^` (chapter 2) and `` ` `` marks (chapter 8) need the player to press Space after
the dead key. Dead-key input also skips the forbidden-key check.

Not tested: QWERTZ, QWERTY, macOS, Linux.

## Findings for the engine

1. **Vim state is global.** Macro recording, registers and the last search survive when an editor
   is destroyed and a new one is created. The game must call `Vim.resetVimGlobalState_()` when a
   level starts. Without it, one level can break the next.
2. **System clipboard register `"+`.** Copy and paste work, but after `"+yy` the register keeps its
   "whole line" flag: text copied later in another program is pasted on a new line and loses its
   last character. The clipboard also needs a browser permission.
3. **The game must use `minimalSetup`.** The headless replay uses it. `basicSetup` adds bracket
   closing and autocompletion, which change what a keystroke does, so a solution could pass in CI
   and fail for the player. `u` needs the history extension; `Ctrl+V` blocks need
   `EditorState.allowMultipleSelections`.
4. **Recorder relies on an undocumented signal** (`inputEvent`) of the plugin. The command line
   (`:` and `/`) is a separate input and is recorded from its own key events. A plugin update can
   break both; the recorder tests will show it.
5. **Forbidden keys block a key, not a command.** With `x` forbidden, `fx` is blocked too.
6. **Paste counts as one keystroke**, whatever its length. Levels must not be solvable by pasting.
7. **Completion does not stop anything yet.** The counter keeps running and the editor stays
   editable after the target is reached.
8. **Key notation.** A literal `<` in a solution string must be written `<lt>`.
9. **The plugin reads legacy `keyCode`** for Enter and Escape on the command line. The replay
   sets it by hand.
10. **`ExParams.argString` is undefined at runtime** although the types declare it. Use
    `params.input`.
11. **Bundle size**: 508 kB (163 kB gzip) for the playground, almost all CodeMirror and the plugin.

## Recommendations

### UI framework

Vanilla TypeScript, no framework. The two Phase 0 pages needed none, the editor already brings
its own rendering, and the bundle is already large. Decide again only if the Phase 1 screens
(results, level select, settings) become hard to keep in sync by hand.

### Chapters in scope

- **Chapters 0 to 3 (MVP):** keep as planned. Every command passes.
- **Chapter 4:** keep.
- **Chapter 5:** remove `it` and `at`. Keep `a"`, but no level may depend on the spaces it leaves.
- **Chapter 6:** keep.
- **Chapter 7:** keep, on condition that `Ctrl+V` also works in Chrome and Edge.
- **Chapter 8:** remove `"+`. Keep the rest.
- **Chapter 9:** keep.
- **Chapter 10:** keep `:s` with plain text, ranges, `:g` and `:norm`. Restrict regex levels to
  patterns that mean the same in Vim and in JavaScript (`.`, `*`, `[a-z]`, `^`, `$`), or drop them.
  Do not teach `\+`, `\(\)` or `\1`.
- **Chapter 11:** depends on the above.

### Keyboard

- Never use `Ctrl+N`, `Ctrl+T` or `Ctrl+W` in a level or a solution.
- Handle dead keys in the engine before Phase 1 levels use `^`: when one key event carries a dead
  key plus a letter (`^x`), split it into two Vim keys. Until then, tell AZERTY players to press
  Space after `^` and `` ` ``.
- Reset the Vim global state at each level start (finding 1).

### Open checks, left to community testers

Decision of the maintainer (2026-11-10): this report is approved and Phase 1 starts. The checks
below stay open until testers with other browsers and keyboards report them, once the repository
is public. `docs/phase0-manual-checklist.md` describes them; each takes a few minutes.

1. Chrome, window mode, 21 steps. Chrome is the most used browser and has no result yet.
2. Chrome and Edge in fullscreen with Keyboard Lock, 6 steps: tells whether fullscreen is worth
   offering as the answer to `Ctrl+W`.
3. One QWERTY or QWERTZ run, if a tester with such a keyboard is available.

Phase 1 work on chapters 0 to 3 does not depend on check 2 or 3. Check 1 is an accepted risk:
if Chrome keeps `Ctrl+R` (redo, chapter 1), the redo levels must change.
