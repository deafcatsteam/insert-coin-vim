// Plays every level solution in Chromium with real key presses (Ctrl+V included),
// through the same session as the game. Run: npm run test:browser
/* global window, localStorage, console, process -- Node script; window and localStorage are the page in evaluate(). */
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
const page = await browser.newPage({ locale: 'en-US' });
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
// Review mode in the real game: skip a level, it comes back the next day, a pass
// moves it to box 1, and a retry after the pass cannot undo it.
const game = await browser.newPage({
  reducedMotion: 'reduce',
  locale: 'en-US',
});
game.on('pageerror', (e) => errors.push(e.message));
const check = (name, ok) => {
  count++;
  if (!ok) {
    failed++;
    console.log(`FAIL review flow: ${name}`);
  }
};
const queue = () =>
  game.evaluate(
    () => JSON.parse(localStorage.getItem('insert-coin-save')).review,
  );
const status = () => game.locator('[role=status]').last().textContent();
const empty = await page.evaluate(async () => {
  const { t } = await import('/src/i18n/i18n.ts');
  return t('review.empty');
});
const at = (date) => game.clock.setFixedTime(new Date(`${date}T12:00:00Z`));
await at('2026-12-01');
await game.goto('http://localhost:4177/');
await game.getByRole('button', { name: 'Start' }).click();
await game.locator('li button').first().click();
await game.getByRole('button', { name: 'Skip level' }).click();
const skipped = await queue();
check(
  'a skip queues the concepts',
  Object.values(skipped).every((c) => c.box === 0),
);
await game.reload();
await game.locator('button', { hasText: /^Review/ }).click();
check('nothing is due the same day', (await status()) === empty);
await at('2026-12-02');
await game.reload();
await game.locator('button', { hasText: /^Review/ }).click();
await game.locator('.cm-content').focus();
for (const key of (await page.evaluate(() => window.levels))[0].solutions[0])
  await game.keyboard.press(toPlaywright(key));
await game.waitForSelector('.ic-results');
const passed = await queue();
check(
  'a pass moves to box 1',
  Object.values(passed).every((c) => c.box === 1),
);
await game.getByRole('button', { name: 'Retry (F2)' }).click();
await game.getByRole('button', { name: 'Skip level' }).click();
check(
  'a retry keeps the pass',
  JSON.stringify(await queue()) === JSON.stringify(passed),
);
check('the queue ends', (await status()) === empty);
await game.getByRole('button', { name: 'Title' }).click();
check(
  'the level list leads back to the title',
  await game.getByRole('button', { name: 'Start' }).isVisible(),
);

// Speedrun of chapter 0 in the real game: F2 starts the run again, the levels
// chain without results, the run is saved, the stars are not.
const chapter0 = (await page.evaluate(() => window.levels)).filter((l) =>
  l.id.startsWith('c00-'),
);
const seeded = Object.fromEntries(
  chapter0.map((l) => [l.id, { stars: 1, keys: 99 }]),
);
await game.evaluate((levels) => {
  localStorage.setItem(
    'insert-coin-save',
    JSON.stringify({ version: 1, levels }),
  );
}, seeded);
await game.reload();
await game.getByRole('button', { name: 'Start' }).click();
await game.getByRole('button', { name: 'Speedrun' }).click();
await game.locator('.cm-content').focus();
await game.keyboard.press(toPlaywright(chapter0[0].solutions[0][0]));
await game.keyboard.press('F2');
check(
  'F2 starts the run again',
  (await game.locator('.ic-tab').textContent()) === chapter0[0].id &&
    (await game.locator('.ic-status').textContent()).includes('Keys: 0'),
);
check(
  'a run level has no skip',
  (await game.getByRole('button', { name: 'Skip level' }).count()) === 0,
);
for (const { id, solutions } of chapter0) {
  await game.waitForFunction(
    (want) => document.querySelector('.ic-tab')?.textContent === want,
    id,
  );
  await game.locator('.cm-content').focus();
  for (const key of solutions[0]) await game.keyboard.press(toPlaywright(key));
}
await game.waitForSelector('text=NEW RECORD');
const saved = JSON.parse(
  await game.evaluate(() => localStorage.getItem('insert-coin-save')),
);
const run = saved.speedrun?.['0'];
check(
  'the run is saved with one split per level',
  run?.splits.length === chapter0.length &&
    run.splits.every((s, i) => i === 0 || s > run.splits[i - 1]) &&
    run.ms === run.splits.at(-1),
);
check(
  'a run gives no stars',
  JSON.stringify(saved.levels) === JSON.stringify(seeded),
);
await game.getByRole('button', { name: 'Levels' }).click();
check(
  'the level list shows the record',
  /^Speedrun · record \d\d:\d\d\.\d$/.test(
    await game.getByRole('button', { name: 'Speedrun' }).textContent(),
  ),
);

for (const e of errors) console.log(`PAGE ERROR ${e}`);
console.log(`${count - failed}/${count} checks passed in Chromium`);
await browser.close();
await server.close();
process.exit(failed || errors.length ? 1 : 0);
