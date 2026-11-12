// Plays every level solution in Chromium with real key presses (Ctrl+V included),
// through the same session as the game. Run: npm run test:browser
/* global window, console, process -- Node script; window is the page in evaluate(). */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const PAGE = `<!doctype html><meta charset="utf-8"><div id="e"></div>
<script type="module">
import { createSession } from '/src/engine/session.ts';
import { levels } from '/src/levels/levels.ts';
import { parseKeys } from '/src/scoring/keys.ts';
let session;
window.levels = levels.map((l) => ({ id: l.id, solutions: l.solutions.map(parseKeys) }));
window.start = (id) => {
  session?.destroy();
  session = createSession(document.getElementById('e'), levels.find((l) => l.id === id));
  session.view.focus();
};
window.result = () => ({ done: session.done, faults: session.faults, keys: session.keys.length });
</script>`;

const NAMES = { Esc: 'Escape', CR: 'Enter', BS: 'Backspace', lt: '<' };
/** One key in Vim notation, as a Playwright key. */
const toPlaywright = (token) => {
  const named = /^<((?:[CSAMD]-)*)(.+)>$/su.exec(token);
  if (!named) return token === ' ' ? 'Space' : token;
  const mods = named[1].includes('C') ? 'Control+' : '';
  return mods + (NAMES[named[2]] ?? named[2]);
};

const server = await createServer({
  logLevel: 'error',
  server: { port: 4177 },
  plugins: [
    {
      name: 'browser-levels-page',
      // A block body: Vite runs a function returned here after its own middlewares.
      configureServer: (s) => {
        s.middlewares.use('/__levels', (_req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end(PAGE);
        });
      },
    },
  ],
});
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4177/__levels');
await page.waitForFunction(() => window.levels);

let failed = 0;
let count = 0;
for (const { id, solutions } of await page.evaluate(() => window.levels)) {
  for (const keys of solutions) {
    await page.evaluate((i) => window.start(i), id);
    for (const key of keys) await page.keyboard.press(toPlaywright(key));
    const got = await page.evaluate(() => window.result());
    const ok = got.done && got.faults === 0 && got.keys === keys.length;
    count++;
    if (!ok) {
      failed++;
      console.log(`FAIL ${id} ${keys.join('')} ${JSON.stringify(got)}`);
    }
  }
}
for (const e of errors) console.log(`PAGE ERROR ${e}`);
console.log(`${count - failed}/${count} solutions passed in Chromium`);
await browser.close();
await server.close();
process.exit(failed || errors.length ? 1 : 0);
