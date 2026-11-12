# Insert Coin

A Vim arcade trainer that runs in the browser. Each level gives you a text and a target.
Change the text into the target with as few keys as possible.

**Play:** https://deafcatsteam.github.io/insert-coin-vim/

![Demo: boot, title, first level, results](docs/demo.gif)

Status: early version (v0.1 in progress). 20 levels teach the basics: modes, moving, deleting,
operators, copy and paste, repeat. You do not need to know Vim to start.

## You need

- A desktop browser.
- A physical keyboard. Any layout: the game reads the character you type, not the key position.

## Help test your keyboard and browser

The game was tested by hand in one browser with one keyboard (a Firefox fork, Windows, AZERTY).
Reports from other browsers and layouts are very welcome, and you do not need to know Vim:

1. Open https://deafcatsteam.github.io/insert-coin-vim/manual.html
2. Press the keys the page lists. The page decides by itself whether each step passed.
3. Click **Copy report** and paste it into a
   [keyboard and browser report](https://github.com/deafcatsteam/insert-coin-vim/issues/new?template=keyboard-report.yml).

## Privacy

The game is a static site. It has no backend, no cookies, no analytics and no tracking, and it
loads nothing from other servers. Your progress stays in your browser (`localStorage`). You can
export it to a file and import it again.

## Run it locally

Needs Node.js 24 or newer.

```bash
npm install
npm run dev          # local server, http://localhost:5173/
npm run lint
npm run typecheck
npm test
npm run validate:levels
npm run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). It explains how to add a level.
The full design is in [SPEC.md](SPEC.md).

## License

- Code: [MIT](LICENSE).
- Level content (`levels/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Fonts: VT323 and IBM Plex Mono, both under the SIL Open Font License 1.1.
