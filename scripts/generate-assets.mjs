/**
 * Generate all raster assets from the SVG sources in `assets/source/` by
 * rendering them in headless Chromium at exact pixel sizes:
 *
 *   assets/icons/icon-{16,32,48,128}.png   extension + Store icons
 *   assets/store/promo/small-promo-440x280.png
 *   assets/store/promo/marquee-promo-1400x560.png
 *   assets/social/github-social-preview-1280x640.png
 *
 * Sources are the artwork of record; generated files are committed because
 * the manifest and Store need the exact bytes. Dimensions are asserted
 * after generation, and the smoke test re-asserts them from the committed
 * files.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, 'assets', 'source');

const TARGETS = [
  { source: 'icon.svg', out: 'assets/icons/icon-16.png', width: 16, height: 16 },
  { source: 'icon.svg', out: 'assets/icons/icon-32.png', width: 32, height: 32 },
  { source: 'icon.svg', out: 'assets/icons/icon-48.png', width: 48, height: 48 },
  { source: 'icon.svg', out: 'assets/icons/icon-128.png', width: 128, height: 128 },
  { source: 'promo-small.svg', out: 'assets/store/promo/small-promo-440x280.png', width: 440, height: 280 },
  { source: 'promo-scene.svg', out: 'assets/store/promo/marquee-promo-1400x560.png', width: 1400, height: 560 },
  { source: 'promo-scene.svg', out: 'assets/social/github-social-preview-1280x640.png', width: 1280, height: 640 },
];

function pageHtml(svg, width, height) {
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent;}
    svg{display:block;width:${width}px;height:${height}px;}
  </style></head><body>${svg}</body></html>`;
}

const browser = await chromium.launch({ channel: 'chromium' });
const results = [];
for (const target of TARGETS) {
  const svg = readFileSync(join(sourceDir, target.source), 'utf8')
    // Non-uniform target ratios stretch unless the viewBox scales to fill.
    .replace('<svg xmlns', `<svg preserveAspectRatio="xMidYMid slice" xmlns`);
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 1,
  });
  await page.setContent(pageHtml(svg, target.width, target.height));
  const outPath = join(root, target.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const png = await page.screenshot({ omitBackground: target.source === 'icon.svg' });
  writeFileSync(outPath, png);
  await page.close();
  results.push({ out: target.out, width: target.width, height: target.height, bytes: png.length });
}
await browser.close();

// Assert real dimensions from the PNG headers.
for (const result of results) {
  const png = readFileSync(join(root, result.out));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== result.width || height !== result.height) {
    throw new Error(`${result.out}: expected ${result.width}x${result.height}, got ${width}x${height}`);
  }
  console.log(`${result.out}  ${width}x${height}  ${result.bytes} bytes`);
}
