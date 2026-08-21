/**
 * Browser suite, part 2: the options page and live settings propagation.
 * Settings changed through the real options UI must reconcile already-open
 * GitHub tabs immediately — including full disable, which removes every
 * owned root without a reload.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';

import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from 'playwright';

import { RICH_FIXTURE, MALFORMED_FIXTURE } from './fixture-page.ts';
import { OWNED_ROOT, launchHarness, type Harness } from './harness.ts';

const RESULTS_DIR = join(process.cwd(), 'artifacts', 'test-results');
let harness: Harness;

before(async () => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  harness = await launchHarness(mkdtempSync(join(tmpdir(), 'tl-opt-')));
  await harness.serve([RICH_FIXTURE, MALFORMED_FIXTURE]);
});

after(async () => {
  await harness.close();
});

beforeEach(async () => {
  // Deterministic start: clear stored settings through an extension page.
  const options = await harness.openOptionsPage();
  await options.evaluate(() => new Promise<void>((resolve) => chrome.storage.local.clear(() => resolve())));
  await options.close();
});

async function saveDraft(options: Page): Promise<void> {
  await options.click('#tlo-save');
  await options.waitForFunction(() => document.getElementById('tlo-status')?.textContent === 'Saved');
}

test('options page loads defaults, previews the panel, and passes axe', async () => {
  const options = await harness.openOptionsPage();
  await options.waitForSelector('#tlo-preview [data-trailer-lens="root"]');
  assert.equal(await options.isChecked('#tlo-enabled'), true);
  assert.equal(await options.inputValue('#tlo-density'), 'auto');
  assert.equal(await options.isChecked('#tlo-diagnostics'), true);
  assert.equal(await options.isChecked('#tlo-unknown'), true);
  assert.equal(await options.locator('#tlo-save').isDisabled(), true);

  const results = await new AxeBuilder({ page: options }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  assert.deepEqual(serious.map((v) => `${v.id}: ${v.description}`), []);

  await options.screenshot({ path: join(RESULTS_DIR, 'options-light.png'), fullPage: true });
  await options.close();
});

test('disabling through options removes panels live; re-enabling restores them', async () => {
  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  const options = await harness.openOptionsPage();
  await options.click('#tlo-enabled');
  await saveDraft(options);
  await commitPage.waitForFunction(
    () => document.querySelectorAll('[data-trailer-lens="root"]').length === 0,
    undefined,
    { timeout: 10000 },
  );

  await options.click('#tlo-enabled');
  await saveDraft(options);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  await options.close();
  await commitPage.close();
});

test('hiding a key removes its row live and shows the honest note', async () => {
  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  const options = await harness.openOptionsPage();
  await options.fill('#tlo-hidden-input', 'Change-Id');
  await options.click('#tlo-hidden-form button[type="submit"]');
  await options.waitForSelector('#tlo-hidden-list code');
  assert.equal(await options.locator('#tlo-hidden-list code').textContent(), 'change-id');
  await saveDraft(options);

  await commitPage.waitForFunction(
    () => ![...document.querySelectorAll('.tl-label')].some((el) => el.textContent === 'Change-Id'),
    undefined,
    { timeout: 10000 },
  );
  const note = await commitPage.evaluate(() =>
    [...document.querySelectorAll('.tl-note')].map((el) => el.textContent).join(' '),
  );
  assert.ok(note.includes('1 trailer hidden by your settings'));

  // Invalid keys are rejected with a visible error, not silently mangled.
  await options.fill('#tlo-hidden-input', 'not a key!');
  await options.click('#tlo-hidden-form button[type="submit"]');
  assert.equal(await options.locator('#tlo-hidden-error').isHidden(), false);

  await options.close();
  await commitPage.close();
});

test('density expanded opens the panel; diagnostics off hides the evidence section', async () => {
  const commitPage = await harness.openCommitPage(MALFORMED_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  assert.ok(await commitPage.locator('.tl-diagnostics').isVisible());

  const options = await harness.openOptionsPage();
  await options.selectOption('#tlo-density', 'expanded');
  await options.click('#tlo-diagnostics');
  await saveDraft(options);

  await commitPage.waitForFunction(
    () => {
      const panel = document.querySelector('.tl-panel');
      return panel instanceof HTMLDetailsElement && panel.open && document.querySelector('.tl-diagnostics') === null;
    },
    undefined,
    { timeout: 10000 },
  );

  await options.close();
  await commitPage.close();
});

test('hiding unknown keys folds them into a count note', async () => {
  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  const options = await harness.openOptionsPage();
  await options.click('#tlo-unknown');
  await saveDraft(options);

  await commitPage.waitForFunction(
    () => ![...document.querySelectorAll('.tl-label')].some((el) => el.textContent === 'Build-Context'),
    undefined,
    { timeout: 10000 },
  );
  const note = await commitPage.evaluate(() =>
    [...document.querySelectorAll('.tl-note')].map((el) => el.textContent).join(' '),
  );
  assert.ok(note.includes('1 unrecognized trailer hidden by your settings'));

  await options.close();
  await commitPage.close();
});

test('settings persist across an options-page reload', async () => {
  const options = await harness.openOptionsPage();
  await options.selectOption('#tlo-density', 'compact');
  await saveDraft(options);
  await options.reload({ waitUntil: 'domcontentloaded' });
  await options.waitForSelector('#tlo-preview');
  assert.equal(await options.inputValue('#tlo-density'), 'compact');
  await options.close();
});

test('reset restores defaults after confirmation', async () => {
  const options = await harness.openOptionsPage();
  await options.click('#tlo-enabled');
  await saveDraft(options);

  await options.click('#tlo-reset');
  assert.equal(await options.locator('#tlo-reset').textContent(), 'Really reset everything?');
  await options.click('#tlo-reset');
  await options.waitForFunction(() => document.getElementById('tlo-status')?.textContent === 'Settings reset');
  assert.equal(await options.locator('#tlo-reset').textContent(), 'Reset to defaults');
  assert.equal(await options.isChecked('#tlo-enabled'), true);
  await options.close();
});

test('options page renders in dark scheme', async () => {
  const options = await harness.openOptionsPage();
  await options.emulateMedia({ colorScheme: 'dark' });
  await options.waitForSelector('#tlo-preview [data-trailer-lens="root"]');
  const bg = await options.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(bg, 'rgb(13, 17, 23)');
  await options.screenshot({ path: join(RESULTS_DIR, 'options-dark.png'), fullPage: true });
  await options.close();
});
