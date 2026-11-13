// Records docs/demo.gif: boot, title, level 1 played, results. Run: npm run demo
import { writeFileSync } from 'node:fs';
import gifenc from 'gifenc';
const { GIFEncoder, applyPalette, quantize } = gifenc;
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4173 } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 780 } });
await page.goto('http://localhost:4173/');

const gif = GIFEncoder();
const FRAME_MS = 120;
/** Captures frames for `ms` milliseconds. */
const record = async (ms) => {
  for (const end = Date.now() + ms; Date.now() < end;) {
    const { data, width, height } = PNG.sync.read(await page.screenshot());
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), width, height, {
      palette,
      delay: FRAME_MS,
    });
  }
};

await record(1600); // boot text (ends by itself at 2.8 s)
await page.keyboard.press('Enter'); // skip boot
await record(1800); // title
await page.keyboard.press('Enter'); // Start
await record(1800); // level list
await page.click('.ic-select ol button'); // first level (click: see note in report)
await record(2200); // level 1 brief
await page.keyboard.press('i');
await record(600);
await page.keyboard.press('Shift+I');
await record(4000); // results
gif.finish();
writeFileSync('docs/demo.gif', gif.bytes());

await browser.close();
await server.close();
