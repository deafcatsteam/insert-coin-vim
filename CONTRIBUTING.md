# Contributing

Thank you for helping. Three kinds of help are useful now: keyboard and browser reports, new
levels, and bug fixes.

## Keyboard and browser reports

No code and no Vim knowledge needed. See "Help test your keyboard and browser" in the
[README](README.md).

## Setup

Needs Node.js 24 or newer.

```bash
npm install
npm run dev
```

Before you open a pull request, run all the checks. CI runs the same ones:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:levels
npm run test:browser
npm run build
```

`npm run format` fixes the formatting. `npm run test:browser` plays every solution in Chromium
with real key presses. It needs Chromium once: `npx playwright install chromium`.

## Rules

- English everywhere: code, comments, commits, issues, pull requests.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
  `docs:`, `test:`, `refactor:`, `chore:`, `ci:`. Keep them small.
- TypeScript strict mode. No `any` without a comment that says why.
- No text for the player in the code. Add a key to `locales/en.json` and use `t('your.key')`.
- Read keys with `KeyboardEvent.key`, never `.code`, so every keyboard layout works.
- Nothing is loaded from another server at runtime: no CDN, no analytics, no cookies.
- A new dependency needs a reason and an MIT, BSD, Apache or OFL compatible license.
- No names, logos or assets from existing franchises.

## How to add a level

1. Copy a file in `levels/`, for example `levels/c00/c00-l01.json`, to
   `levels/<chapter>/<id>.json`. The id has the form `c03-l06`: chapter, then level number.
   Levels play in the order of their ids.
2. Fill in the fields. `levels/level.schema.json` describes each one.
   - `start`: the text the player gets. `target`: the text to reach.
   - `solutions`: one or more key sequences that change `start` into `target`. Write special
     keys like Vim does: `<Esc>`, `<CR>`, `<C-r>`.
   - `optimal`: the number of keys of the shortest solution that uses only keys taught up to
     this level. Look for shorter ones with those keys (counts, `.`, `D`, `C`) before you send
     the level. Keys are counted like VimGolf: `<Esc>` is one key, `<C-r>` is one key, a capital
     letter is one key.
   - `par`: the number of keys for a good, not perfect, answer.
   - `concepts`: what the level teaches. Review mode brings these back. Pick them from the list
     in `levels/level.schema.json`. A new concept goes in that list first.
   - `author`: your name or handle. `license`: `CC-BY-4.0`.
3. Add the texts to `locales/en.json`: `levels.<id>.title`, `levels.<id>.brief`,
   `levels.<id>.hint1`, `levels.<id>.hint2`. The level file refers to these keys. Other
   languages are optional: a missing key shows the English text.
4. Run `npm run validate:levels`. It checks the file against the schema, checks that every text
   key exists, and replays every solution in the real editor.

An expert golf puzzle goes in `levels/golf/gNN.json` instead, with `chapter` 11, a brief and
`"hints": []`. Free Golf is the only place it is played, so any key is fair and `optimal` is the
shortest solution you found.

Limits to respect:

- A solution ends on the key that completes the level. The level ends as soon as the text equals
  `target`, so do not add a final `<Esc>`.
- Do not use `Ctrl+N`, `Ctrl+T` or `Ctrl+W`: browsers keep these keys for themselves.
- Use only commands marked as supported in `docs/support-matrix.md`.
- Teach one new idea per level, and say in `brief` which keys do what. Many players have never
  used Vim.

## How to translate

Each language is one file in `locales/`, named after its language tag: `fr.json`,
`pt-BR.json`. The game finds new files by itself.

1. To add a language, copy `locales/en.json` to `locales/<tag>.json` and translate the values.
   `lang.name` is the name of the language in that language, for the menu on the title screen.
2. Keep Vim keys, commands and the words of the level texts as they are: the buffers stay in
   English, so `slow` must stay `slow`.
3. Keep every `{variable}` of the English text.
4. Run `npm test`. It checks that each file has no unknown key and keeps the variables.

To fix a translation, edit the file and open a pull request with the `i18n` label.

By adding a level you agree to publish it under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Code contributions are under the
[MIT license](LICENSE).
