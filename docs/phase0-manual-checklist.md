# Phase 0 manual checklist

These checks need a real keyboard and a real browser. Everything else is covered by `npm test`.

You do not need to know Vim. The page tells you which keys to press and decides by itself whether
a step passed. A failed step is a result, not a mistake: the goal is to learn what does not work.

## Start

1. In a terminal, in the project folder, run `npm run dev`.
2. Open `http://localhost:5173/manual.html` in the browser under test.

## Rules for every step

- Use only the keyboard inside the editor. Do not click in the editor: a click moves the cursor.
- Press the keys listed on the page, in order. The text in brackets says what each key does.
- When `Status` shows `PASS`, click **Next step**.
- If it still shows `not yet` after you pressed all the keys, click **Next step** anyway.
  The page records the failure with the keys it saw.
- If you pressed a wrong key, click **Redo this step**.
- If the page reloads or the tab closes, open the address again. The page records what happened
  and continues with the next step.

## Runs

Do run 1 first. The other runs are short. Skip a browser that is not installed.

| Run | Browser | Before step 1                             | Steps   | Done |
| --- | ------- | ----------------------------------------- | ------- | ---- |
| 1   | Chrome  | nothing                                   | 1 to 21 | [ ]  |
| 2   | Chrome  | click **Fullscreen**                      | 1 to 6  | [ ]  |
| 3   | Chrome  | click **Fullscreen + keyboard lock**      | 1 to 6  | [ ]  |
| 4   | Firefox | nothing                                   | 1 to 21 | [x]  |
| 5   | Firefox | click **Fullscreen**                      | 1 to 6  | [ ]  |
| 6   | Edge    | nothing                                   | 1 to 6  | [ ]  |
| 7   | Edge    | click **Fullscreen + keyboard lock**      | 1 to 6  | [ ]  |

Run 4 was done in Zen, a Firefox fork (Gecko engine, reports itself as Firefox 159), on Windows
with an AZERTY keyboard. The other runs were not done; see `docs/phase0-report.md`. They are open
to any tester: a run in another browser or with another keyboard is a welcome contribution.

Between two runs in the same browser, click **Back to step 1**. Do not click **Clear report**:
the report keeps every run and marks each line with `window`, `fullscreen` or `fullscreen+lock`.

In a fullscreen run, a key may throw the page out of fullscreen (`Esc` is the likely one).
Click the same fullscreen button again, then go on with the next step.

## Send the result

After the last run in a browser, click **Copy report** and paste the text to the reviewer,
once per browser. The first line of the report names the browser.

## Not covered

- QWERTZ and QWERTY layouts: the steps were written for an AZERTY keyboard.
- macOS and Linux.
