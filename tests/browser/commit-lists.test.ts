import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';

import { commitListFixtureHtml, commitListFixtureUrl, RICH_MESSAGE, RICH_SHA, type CommitListFixture } from './fixture-page.ts';
import { launchHarness, type Harness } from './harness.ts';

let harness: Harness;
const surfaces: readonly CommitListFixture['surface'][] = ['pr-overview', 'pr-commits', 'repository-history'];

before(async () => { harness = await launchHarness(mkdtempSync(join(tmpdir(), 'tl-lists-'))); });
after(async () => harness.close());
beforeEach(async () => {
  const options = await harness.openOptionsPage();
  await options.evaluate(() => new Promise<void>((resolve) => chrome.storage.local.clear(() => resolve())));
  await options.close();
});

for (const surface of surfaces) {
  test(`${surface} reads hydrated title unchanged and provides an independent disclosure`, async () => {
    const fixture: CommitListFixture = { surface, owner: 'fixture-org', repo: 'fixture-repo', sha: RICH_SHA, message: RICH_MESSAGE };
    await harness.serveRaw(new Map([[commitListFixtureUrl(fixture), commitListFixtureHtml(fixture)]]));
    const page = await harness.context.newPage();
    await page.goto(commitListFixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-trailer-lens="list-root"]');
    const initial = await page.evaluate(() => {
      const root = document.querySelector('[data-trailer-lens="list-root"]') as HTMLElement;
      const button = root.querySelector('.tl-disclosure') as HTMLButtonElement;
      return { title: document.querySelector('a[title]')?.getAttribute('title'), fragments: [...root.querySelectorAll('.tl-fragment')].map((item) => item.textContent), count: button.textContent, expanded: button.getAttribute('aria-expanded') };
    });
    assert.equal(initial.title, RICH_MESSAGE);
    assert.deepEqual(initial.fragments, ['Co-authored by:Tala, Juno']);
    assert.equal(initial.count, 'Trailers 7');
    assert.equal(initial.expanded, 'false');
    await page.locator('.tl-disclosure').press('Enter');
    await page.waitForFunction(() => document.querySelector('.tl-disclosure')?.getAttribute('aria-expanded') === 'true');
    assert.ok(await page.locator('.tl-list-details .tl-raw-lines').count());
    await page.close();
  });
}

test('zero compact rules preserve the strict evidence trigger', async () => {
  const fixture: CommitListFixture = { surface: 'repository-history', owner: 'fixture-org', repo: 'fixture-repo', sha: RICH_SHA, message: RICH_MESSAGE };
  await harness.serveRaw(new Map([[commitListFixtureUrl(fixture), commitListFixtureHtml(fixture)]]));
  const options = await harness.openOptionsPage();
  await options.evaluate(() => new Promise<void>((resolve) => chrome.storage.local.set({ settings: { version: 3, enabled: true, detailMode: 'auto', showDiagnostics: true, showUnknownKeys: true, hiddenKeys: [], memoryEnabled: false, compactRules: [] } }, () => resolve())));
  await options.close();
  const page = await harness.context.newPage();
  await page.goto(commitListFixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-trailer-lens="list-root"]');
  assert.equal(await page.locator('.tl-fragment').count(), 0);
  assert.equal(await page.locator('.tl-disclosure').textContent(), 'Trailers 7');
  await page.close();
});

test('title drift removes only the owned list root and preserves the new native source', async () => {
  const fixture: CommitListFixture = { surface: 'repository-history', owner: 'fixture-org', repo: 'fixture-repo', sha: RICH_SHA, message: RICH_MESSAGE };
  await harness.serveRaw(new Map([[commitListFixtureUrl(fixture), commitListFixtureHtml(fixture)]]));
  const page = await harness.context.newPage();
  await page.goto(commitListFixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-trailer-lens="list-root"]');
  await page.locator('a[title]').evaluate((source) => source.setAttribute('title', 'Ordinary hydrated subject'));
  await page.waitForFunction(() => document.querySelector('[data-trailer-lens="list-root"]') === null);
  assert.equal(await page.locator('a[title]').getAttribute('title'), 'Ordinary hydrated subject');
  await page.close();
});

test('a malformed nearby route candidate cannot become a compact provenance fact', async () => {
  const message = [
    'Preserve strict evidence',
    '',
    'Co-authored-via: Juno | Claude Code | Opus 5 | Max',
    '',
    'Co-authored-by: Juno <juno@example.com>',
  ].join('\n');
  const fixture: CommitListFixture = { surface: 'pr-commits', owner: 'fixture-org', repo: 'fixture-repo', sha: RICH_SHA, message };
  await harness.serveRaw(new Map([[commitListFixtureUrl(fixture), commitListFixtureHtml(fixture)]]));
  const options = await harness.openOptionsPage();
  await options.evaluate(() => new Promise<void>((resolve) => chrome.storage.local.set({ settings: {
    version: 3, enabled: true, detailMode: 'auto', showDiagnostics: true, showUnknownKeys: true, hiddenKeys: [], memoryEnabled: false,
    compactRules: [{ key: 'co-authored-via', enabled: true, label: 'default', customLabel: '', values: 'first', maxValues: 3, projection: 'delimiter-segment' }],
  } }, () => resolve())));
  await options.close();
  const page = await harness.context.newPage();
  await page.goto(commitListFixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-trailer-lens="list-root"]');
  assert.equal(await page.locator('.tl-fragment').count(), 0);
  assert.equal(await page.locator('.tl-disclosure').textContent(), 'Trailers 1');
  await page.close();
});

test('paired route projection selects the first post-identity segment and maxValues controls overflow', async () => {
  const fixture: CommitListFixture = { surface: 'pr-commits', owner: 'fixture-org', repo: 'fixture-repo', sha: RICH_SHA, message: RICH_MESSAGE };
  await harness.serveRaw(new Map([[commitListFixtureUrl(fixture), commitListFixtureHtml(fixture)]]));
  const options = await harness.openOptionsPage();
  await options.evaluate(() => new Promise<void>((resolve) => chrome.storage.local.set({ settings: {
    version: 3, enabled: true, detailMode: 'auto', showDiagnostics: true, showUnknownKeys: true, hiddenKeys: [], memoryEnabled: false,
    compactRules: [
      { key: 'co-authored-via', enabled: true, label: 'custom', customLabel: 'via', values: 'first', maxValues: 1, projection: 'delimiter-segment' },
      { key: 'co-authored-by', enabled: true, label: 'default', customLabel: '', values: 'combine', maxValues: 1, projection: 'person-name' },
    ],
  } }, () => resolve())));
  await options.close();
  const page = await harness.context.newPage();
  await page.goto(commitListFixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-trailer-lens="list-root"]');
  assert.deepEqual(await page.locator('.tl-fragment').allTextContents(), ['via:Claude Code', 'Co-authored by:Tala, and 1 more']);
  await page.close();
});
