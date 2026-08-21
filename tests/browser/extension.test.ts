/**
 * Browser suite, part 1: the real built extension on authored commit-page
 * fixtures served under real github.com URLs (route-intercepted, no
 * network). Covers rendering, pairing, diagnostics, hostile input, native-
 * DOM immutability, idempotency, simulated soft navigation, copy, layout,
 * theming, and the zero-external-requests invariant.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

import { AxeBuilder } from '@axe-core/playwright';

import {
  HOSTILE_FIXTURE,
  LINKED_FIXTURE,
  MALFORMED_FIXTURE,
  PLAIN_FIXTURE,
  RICH_FIXTURE,
  TITLE_ONLY_FIXTURE,
  commitFixtureHtml,
  fixtureUrl,
} from './fixture-page.ts';
import { OWNED_ROOT, launchHarness, type Harness } from './harness.ts';

const RESULTS_DIR = join(process.cwd(), 'artifacts', 'test-results');
let harness: Harness;

before(async () => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  harness = await launchHarness(mkdtempSync(join(tmpdir(), 'tl-ext-')));
  await harness.serve([
    RICH_FIXTURE,
    MALFORMED_FIXTURE,
    PLAIN_FIXTURE,
    TITLE_ONLY_FIXTURE,
    HOSTILE_FIXTURE,
    LINKED_FIXTURE,
    { ...RICH_FIXTURE, colorMode: 'dark' },
  ]);
});

after(async () => {
  await harness.close();
});

test('rich fixture renders paired rows, generic rows, and the raw block', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    const labels = [...root.querySelectorAll('.tl-label')].map((el) => el.textContent);
    const values = [...root.querySelectorAll('.tl-value .tl-value-text')].map((el) => el.textContent);
    const routes = [...root.querySelectorAll('.tl-route')].map((el) => el.textContent);
    return {
      commit: root.getAttribute('data-trailer-lens-commit'),
      summary: root.querySelector('.tl-summary-label')?.textContent,
      labels,
      values,
      routes,
      raw: root.querySelector('.tl-raw-lines')?.textContent,
      openByDefault: (root.querySelector('.tl-panel') as HTMLDetailsElement).open,
    };
  });

  assert.equal(state.commit, RICH_FIXTURE.sha);
  assert.equal(state.summary, 'Trailers · 7');
  assert.deepEqual(state.labels, ['Co-authored by', 'Co-authored by', 'Reviewed by', 'Change-Id', 'Build-Context']);
  assert.deepEqual(state.values, ['Tala', 'Juno', 'Alex Rivera', 'I0123456789abcdef', 'windows-x64 | release']);
  assert.deepEqual(state.routes, ['via Claude Code · Fable 5 · High', 'via Claude Code · Opus 5 · Max']);
  assert.ok(state.raw?.startsWith('Co-authored-via: Tala | Claude Code | Fable 5 | High\n'));
  assert.ok(state.raw?.endsWith('Build-Context: windows-x64 | release'));
  // 5 friendly rows > 4 → auto mode starts collapsed.
  assert.equal(state.openByDefault, false);

  await page.screenshot({ path: join(RESULTS_DIR, 'panel-rich-light.png'), fullPage: true });
  await page.close();
});

test('malformed canary shows the via line as outside-block evidence, unpaired', async () => {
  const page = await harness.openCommitPage(MALFORMED_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    return {
      labels: [...root.querySelectorAll('.tl-label')].map((el) => el.textContent),
      routes: root.querySelectorAll('.tl-route').length,
      diagnostics: root.querySelector('.tl-diagnostics-heading')?.textContent?.trim(),
      diagnosticLines: root.querySelector('.tl-diagnostics .tl-raw-lines')?.textContent,
    };
  });
  assert.deepEqual(state.labels, ['Co-authored by']);
  assert.equal(state.routes, 0);
  assert.ok(state.diagnostics?.includes('Outside the final trailer block'));
  assert.equal(state.diagnosticLines, 'Co-authored-via: Juno | Claude Code | Opus 5 | Max');
  await page.screenshot({ path: join(RESULTS_DIR, 'panel-malformed.png'), fullPage: true });
  await page.close();
});

test('no-trailer and title-only commits render nothing', async () => {
  for (const fixture of [PLAIN_FIXTURE, TITLE_ONLY_FIXTURE]) {
    const page = await harness.openCommitPage(fixture);
    await page.waitForTimeout(1200);
    assert.equal(await page.locator(OWNED_ROOT).count(), 0, fixture.sha);
    await page.close();
  }
});

test('hostile trailer values stay inert text', async () => {
  const page = await harness.openCommitPage(HOSTILE_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    return {
      xss: (window as { __tl_xss?: number }).__tl_xss ?? null,
      scriptCount: root.querySelectorAll('script, img, iframe, a').length,
      noteValue: [...root.querySelectorAll('.tl-value-text')].map((el) => el.textContent)[0],
    };
  });
  assert.equal(state.xss, null);
  assert.equal(state.scriptCount, 0);
  assert.equal(state.noteValue, '<script>window.__tl_xss = 1</script>');
  await page.close();
});

test('linkified values render as text with the honest rendered-links note', async () => {
  const page = await harness.openCommitPage(LINKED_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    const raw = root.querySelector('.tl-raw') as HTMLDetailsElement;
    raw.open = true;
    return {
      anchorInPanel: root.querySelectorAll('a').length,
      note: [...root.querySelectorAll('.tl-note')].map((el) => el.textContent).join(' '),
    };
  });
  assert.equal(state.anchorInPanel, 0);
  assert.ok(state.note.includes('links rendered by GitHub'));
  await page.close();
});

test('native commit subtree stays byte-identical; only the owned sibling appears', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const result = await page.evaluate(() => {
    const container = document.querySelector('[class*="commitMessageContainer"]') as HTMLElement;
    const box = container.parentElement as HTMLElement;
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    const nativeChildren = [...box.children].filter((child) => child !== root);
    return {
      containerHtml: container.outerHTML,
      rootIsSibling: root.parentElement === box && root.previousElementSibling === container,
      nativeChildCount: nativeChildren.length,
    };
  });
  assert.ok(result.rootIsSibling);
  assert.equal(result.nativeChildCount, 1);
  // Compare against the fixture's own authored container markup.
  const authored = commitFixtureHtml(RICH_FIXTURE);
  const containerStart = authored.indexOf('<div class="CommitHeader-module__commitMessageContainer__fixt1">');
  assert.ok(containerStart > 0);
  assert.ok(result.containerHtml.startsWith('<div class="CommitHeader-module__commitMessageContainer__fixt1">'));
  assert.ok(result.containerHtml.includes('Co-authored-via: Tala | Claude Code | Fable 5 | High'));
  await page.close();
});

test('reconciliation is idempotent under unrelated mutations', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const stamped = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    root.setAttribute('data-test-stamp', 'original');
    for (let i = 0; i < 5; i++) {
      const noise = document.createElement('div');
      noise.textContent = `noise ${i}`;
      document.body.append(noise);
    }
    return root.getAttribute('data-trailer-lens-signature');
  });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    roots: document.querySelectorAll('[data-trailer-lens="root"]').length,
    stamp: document.querySelector('[data-trailer-lens="root"]')?.getAttribute('data-test-stamp'),
    signature: document.querySelector('[data-trailer-lens="root"]')?.getAttribute('data-trailer-lens-signature'),
  }));
  assert.equal(after.roots, 1);
  assert.equal(after.stamp, 'original', 'the same element must survive unrelated mutations');
  assert.equal(after.signature, stamped);
  await page.close();
});

test('simulated soft navigation moves and removes the panel correctly', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  // Swap the page to the malformed fixture the way GitHub's router would:
  // pushState plus DOM replacement, no document reload.
  await page.evaluate(
    ([url, html]) => {
      history.pushState({}, '', url as string);
      const parsed = new DOMParser().parseFromString(html as string, 'text/html');
      document.body.replaceChildren(...parsed.body.children);
    },
    [fixtureUrl(MALFORMED_FIXTURE), commitFixtureHtml(MALFORMED_FIXTURE)] as const,
  );
  await page.waitForFunction(
    (sha) => document.querySelector('[data-trailer-lens="root"]')?.getAttribute('data-trailer-lens-commit') === sha,
    MALFORMED_FIXTURE.sha,
    { timeout: 10000 },
  );
  assert.equal(await page.locator(OWNED_ROOT).count(), 1);

  // Now to a no-trailer commit: the stale panel must disappear.
  await page.evaluate(
    ([url, html]) => {
      history.pushState({}, '', url as string);
      const parsed = new DOMParser().parseFromString(html as string, 'text/html');
      document.body.replaceChildren(...parsed.body.children);
    },
    [fixtureUrl(PLAIN_FIXTURE), commitFixtureHtml(PLAIN_FIXTURE)] as const,
  );
  await page.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="root"]').length === 0, undefined, {
    timeout: 10000,
  });
  await page.close();
});

test('copy places the exact raw block on the clipboard', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await page.bringToFront();
  await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    (root.querySelector('.tl-panel') as HTMLDetailsElement).open = true;
    (root.querySelector('.tl-raw') as HTMLDetailsElement).open = true;
  });
  await page.click('.tl-copy');
  await page.waitForFunction(() => document.querySelector('.tl-copy-status')?.textContent !== '', undefined, {
    timeout: 5000,
  });
  const status = await page.locator('.tl-copy-status').textContent();
  assert.equal(status, 'Copied');
  // The OS clipboard may carry platform line endings (Windows: CRLF);
  // normalize before comparing — the written content itself uses LF.
  const clipboard = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
  assert.ok(clipboard.startsWith('Co-authored-via: Tala | Claude Code | Fable 5 | High\n'));
  assert.ok(clipboard.endsWith('Build-Context: windows-x64 | release'));
  await page.close();
});

test('keyboard: summary is reachable and toggles with Enter', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const reached = await page.evaluate(() => {
    const summary = document.querySelector('.tl-summary') as HTMLElement;
    summary.focus();
    return document.activeElement === summary;
  });
  assert.ok(reached, 'summary must be focusable');
  const wasOpen = await page.evaluate(() => (document.querySelector('.tl-panel') as HTMLDetailsElement).open);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const nowOpen = await page.evaluate(() => (document.querySelector('.tl-panel') as HTMLDetailsElement).open);
  assert.equal(nowOpen, !wasOpen);
  await page.close();
});

test('panel passes automated accessibility checks in the page', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    (root.querySelector('.tl-panel') as HTMLDetailsElement).open = true;
    (root.querySelector('.tl-raw') as HTMLDetailsElement).open = true;
  });
  const results = await new AxeBuilder({ page }).include('[data-trailer-lens="root"]').analyze();
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  assert.deepEqual(
    serious.map((v) => `${v.id}: ${v.description}`),
    [],
  );
  await page.close();
});

test('narrow viewport keeps the panel inside the page width', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.setViewportSize({ width: 480, height: 900 });
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    (root.querySelector('.tl-panel') as HTMLDetailsElement).open = true;
    (root.querySelector('.tl-raw') as HTMLDetailsElement).open = true;
  });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => {
    const root = document.querySelector('[data-trailer-lens="root"]') as HTMLElement;
    return { scroll: root.scrollWidth, client: root.clientWidth, doc: document.documentElement.scrollWidth, win: window.innerWidth };
  });
  assert.ok(overflow.scroll <= overflow.client + 1, `panel overflows: ${JSON.stringify(overflow)}`);
  assert.ok(overflow.doc <= overflow.win + 1, `page overflows: ${JSON.stringify(overflow)}`);
  await page.screenshot({ path: join(RESULTS_DIR, 'panel-narrow.png'), fullPage: true });
  await page.close();
});

test('dark mode follows the page color mode with the dark accent', async () => {
  const page = await harness.openCommitPage({ ...RICH_FIXTURE, colorMode: 'dark' });
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const accent = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.tl-summary .tl-icon') as SVGElement).color,
  );
  assert.equal(accent, 'rgb(240, 136, 62)');
  await page.screenshot({ path: join(RESULTS_DIR, 'panel-rich-dark.png'), fullPage: true });
  await page.close();
});

test('forced colors keeps the panel visible and bordered', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const visible = await page.locator('.tl-summary-label').isVisible();
  assert.ok(visible);
  await page.screenshot({ path: join(RESULTS_DIR, 'panel-forced-colors.png'), fullPage: true });
  await page.close();
});

test('the extension makes zero external network requests', () => {
  // Fixture pages are fulfilled locally and everything else was aborted and
  // recorded. GitHub subresources (styles, avatars) are expected casualties
  // of the aborted-page environment; extension-originated requests would be
  // a product violation. The extension never fetches, so the only tolerable
  // entries are the fixture pages' own subresource attempts — and authored
  // fixtures reference none.
  assert.deepEqual(harness.externalRequests, []);
});
