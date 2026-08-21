/**
 * Store and README screenshots, rendered from the real built extension.
 *
 * Every panel pixel comes from the actual content script running in
 * Chromium against staged commit-page fixtures (served under github.com
 * URLs via route interception, exactly like the browser test suites). The
 * page shell around the panel is a sanitized fixture — stated in
 * assets/store/listing.md — because Store screenshots must be
 * deterministic and free of unrelated third-party content. Nothing in the
 * panel is mocked.
 *
 * Output: assets/store/screenshots/*.png (1280x800, Store-required size)
 *         docs/images/*.png (README copies)
 */

import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { commitFixtureHtml, escapeHtml, fixtureUrl } from '../tests/browser/fixture-page.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const shotsDir = join(root, 'assets', 'store', 'screenshots');
const readmeDir = join(root, 'docs', 'images');

const CLAUDE_PAIRED = {
  owner: 'acme',
  repo: 'weather-service',
  sha: 'b1c2d3e4f5a60000000000000000000000000001',
  subject: 'Harden retry behavior in the forecast client',
  bodyHtml: escapeHtml(
    [
      'Retries now use jittered exponential backoff, and the client refuses',
      'to retry non-idempotent requests.',
      '',
      'Co-authored-via: Claude | Claude Code | Opus 5 | High',
      'Co-authored-by: Claude <noreply@anthropic.com>',
      'Reviewed-by: Alex Rivera <alex@example.com>',
    ].join('\n'),
  ),
};

const GENERIC = {
  owner: 'acme',
  repo: 'weather-service',
  sha: 'b1c2d3e4f5a60000000000000000000000000002',
  subject: 'Fix buffer accounting in the ingest pipeline',
  bodyHtml: escapeHtml(
    [
      'The ring buffer under-reported its high-water mark after a wrap.',
      '',
      'Reviewed-by: Priya Natarajan <priya@example.com>',
      'Tested-by: CI on Windows and Linux',
      'Signed-off-by: Morgan Chen <morgan@example.com>',
      'Change-Id: I9fd07c1b2aa4e0d872ae',
      'Deploy-Stage: canary',
    ].join('\n'),
  ),
};

const MALFORMED = {
  owner: 'acme',
  repo: 'weather-service',
  sha: 'b1c2d3e4f5a60000000000000000000000000003',
  subject: 'Preserve route evidence in squashed commits',
  bodyHtml: escapeHtml(
    [
      'One stray blank line is enough: Git silently drops the line above it',
      'from the trailer block, and the page looks perfectly healthy.',
      '',
      'Co-authored-via: Claude | Claude Code | Opus 5 | High',
      '',
      'Co-authored-by: Claude <noreply@anthropic.com>',
    ].join('\n'),
  ),
};

const profile = mkdtempSync(join(tmpdir(), 'tl-shots-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});

const scenes = new Map();
for (const fixture of [CLAUDE_PAIRED, GENERIC, MALFORMED]) {
  scenes.set(fixtureUrl(fixture), commitFixtureHtml(fixture));
  scenes.set(fixtureUrl(fixture) + '?theme=dark', commitFixtureHtml({ ...fixture, colorMode: 'dark' }));
}
await context.route(/^https?:\/\//, async (route) => {
  const body = scenes.get(route.request().url());
  if (body !== undefined) await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
  else await route.abort();
});

mkdirSync(shotsDir, { recursive: true });
mkdirSync(readmeDir, { recursive: true });

const page = await context.newPage();

async function openScene(fixture, { openPanel = true, openRaw = false, dark = false } = {}) {
  await page.goto(fixtureUrl(fixture) + (dark ? '?theme=dark' : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-trailer-lens="root"]', { timeout: 10000 });
  await page.evaluate(
    ([panel, raw]) => {
      const root = document.querySelector('[data-trailer-lens="root"]');
      const details = root.querySelector('.tl-panel');
      details.open = Boolean(panel);
      const rawEl = root.querySelector('.tl-raw');
      if (rawEl) rawEl.open = Boolean(raw);
    },
    [openPanel, openRaw],
  );
  await page.waitForTimeout(250);
}

// 01 — the problem: the same commit before and after, stacked. The before
// half comes from a browser without the extension (that is what "without
// Trailer Lens" is); the after half is the real extension rendering.
const plain = await chromium.launch({ channel: 'chromium' });
const plainPage = await plain.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await plainPage.route(/^https?:\/\//, async (route) => {
  const body = scenes.get(route.request().url());
  if (body !== undefined) await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
  else await route.abort();
});
await plainPage.goto(fixtureUrl(CLAUDE_PAIRED), { waitUntil: 'domcontentloaded' });
const beforePng = await plainPage.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 360 } });
await plain.close();
await openScene(CLAUDE_PAIRED, { openPanel: true });
const afterPng = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 430 } });
const composite = await context.newPage();
await composite.setViewportSize({ width: 1280, height: 800 });
await composite.setContent(`<!doctype html><html><body style="margin:0;background:#f6f8fa;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="padding:2px 16px 0"><p style="margin:6px 0 4px;font-size:13px;font-weight:600;color:#59636e;">Without Trailer Lens</p>
  <img style="display:block;width:1248px;border:1px solid #d1d9e0;border-radius:8px;" src="data:image/png;base64,${beforePng.toString('base64')}"></div>
  <div style="padding:0 16px"><p style="margin:10px 0 4px;font-size:13px;font-weight:600;color:#cf4d0f;">With Trailer Lens</p>
  <img style="display:block;width:1248px;border:1px solid #d1d9e0;border-radius:8px;" src="data:image/png;base64,${afterPng.toString('base64')}"></div>
</body></html>`);
await composite.screenshot({ path: join(shotsDir, '01-before-after.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });
await composite.close();

// 02 — the paired Claude-shaped specimen.
await openScene(CLAUDE_PAIRED, { openPanel: true });
await page.screenshot({ path: join(shotsDir, '02-paired-co-author.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });

// 03 — generic review/test/sign-off/custom metadata.
await openScene(GENERIC, { openPanel: true });
await page.screenshot({ path: join(shotsDir, '03-generic-trailers.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });

// 04 — the malformed blank-line case with the raw disclosure open.
await openScene(MALFORMED, { openPanel: true, openRaw: true });
await page.screenshot({ path: join(shotsDir, '04-malformed-evidence.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });

// 05 — options page in dark mode.
const extId = await (async () => {
  const p = await context.newPage();
  await p.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => {
    const m = document.querySelector('extensions-manager');
    const l = m?.shadowRoot?.querySelector('extensions-item-list');
    return (l?.shadowRoot?.querySelectorAll('extensions-item').length ?? 0) > 0;
  });
  const id = await p.evaluate(() => {
    const m = document.querySelector('extensions-manager');
    const l = m?.shadowRoot?.querySelector('extensions-item-list');
    return l?.shadowRoot?.querySelector('extensions-item')?.getAttribute('id') ?? null;
  });
  await p.close();
  return id;
})();
const options = await context.newPage();
await options.setViewportSize({ width: 1280, height: 800 });
await options.emulateMedia({ colorScheme: 'dark' });
await options.goto(`chrome-extension://${extId}/options.html`, { waitUntil: 'domcontentloaded' });
await options.waitForSelector('#tlo-preview [data-trailer-lens="root"]');
await options.screenshot({ path: join(shotsDir, '05-settings-dark.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });
await options.close();

// README copies: the paired specimen (light + dark) and the malformed shot.
await openScene(CLAUDE_PAIRED, { openPanel: true, dark: true });
await page.screenshot({ path: join(readmeDir, 'panel-dark.png'), clip: { x: 0, y: 0, width: 1280, height: 460 } });
copyFileSync(join(shotsDir, '02-paired-co-author.png'), join(readmeDir, 'panel-light.png'));
copyFileSync(join(shotsDir, '01-before-after.png'), join(readmeDir, 'before-after.png'));
copyFileSync(join(shotsDir, '04-malformed-evidence.png'), join(readmeDir, 'malformed-evidence.png'));

await context.close();
rmSync(profile, { recursive: true, force: true });

for (const file of ['01-before-after', '02-paired-co-author', '03-generic-trailers', '04-malformed-evidence', '05-settings-dark']) {
  const png = readFileSync(join(shotsDir, `${file}.png`));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1280 || height !== 800) throw new Error(`${file}: ${width}x${height} is not 1280x800`);
  console.log(`${file}.png  ${width}x${height}  ${png.length} bytes`);
}
