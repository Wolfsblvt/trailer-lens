/**
 * Packaged-extension smoke: the exact extracted ZIP contents (produced by
 * `verify-package`) load as an unpacked extension and render correctly.
 * This is the shipped-bytes check — dist/ freshness proves nothing about
 * the archive a reviewer or user actually receives.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

import { MALFORMED_FIXTURE, RICH_FIXTURE } from '../browser/fixture-page.ts';
import { OWNED_ROOT, launchHarness, type Harness } from '../browser/harness.ts';

const extracted = join(process.cwd(), 'artifacts', 'packages', 'extracted');
let harness: Harness;

before(async () => {
  assert.ok(
    existsSync(join(extracted, 'manifest.json')),
    'run `npm run package && npm run verify:package` first — this suite loads the extracted ZIP',
  );
  process.env['TL_EXT_DIR'] = extracted;
  harness = await launchHarness(mkdtempSync(join(tmpdir(), 'tl-pkg-')));
  await harness.serve([RICH_FIXTURE, MALFORMED_FIXTURE]);
});

after(async () => {
  delete process.env['TL_EXT_DIR'];
  await harness.close();
});

test('the extracted package renders the panel with paired rows', async () => {
  const page = await harness.openCommitPage(RICH_FIXTURE);
  await page.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('.tl-label')].map((el) => el.textContent),
  );
  assert.deepEqual(labels, ['Co-authored by', 'Co-authored by', 'Reviewed by', 'Change-Id', 'Build-Context']);
  await page.close();
});

test('the extracted package shows malformed evidence and its options page loads', async () => {
  const page = await harness.openCommitPage(MALFORMED_FIXTURE);
  await page.waitForSelector('.tl-diagnostics', { timeout: 10000 });
  await page.close();

  const options = await harness.openOptionsPage();
  assert.equal(await options.title(), 'Trailer Lens settings');
  await options.close();
});

test('the packaged run made zero external requests', () => {
  assert.deepEqual(harness.externalRequests, []);
});
