/**
 * Browser suite, part 3: device-local trailer memory (1.1).
 *
 * The whole journey runs against the real built extension: enable memory
 * through the real options UI, learn on a commit-page fixture, then see the
 * remembered chip on reference-surface fixtures — with every refusal gate
 * exercised (default-off, short SHA, unknown commit, comment-body links,
 * disable, purge).
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from 'playwright';

import {
  MALFORMED_FIXTURE,
  MALFORMED_SHA,
  RICH_FIXTURE,
  RICH_SHA,
  referenceFixtureHtml,
  referenceFixtureUrl,
  type ReferenceFixture,
} from './fixture-page.ts';
import { OWNED_ROOT, launchHarness, type Harness } from './harness.ts';

const CHIP = '[data-trailer-lens="chip"]';
const UNKNOWN_SHA = 'dddd000000000000000000000000000000000009';

const BLAME_FIXTURE: ReferenceFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  routePath: 'blame/main/README.md',
  fullOids: [RICH_SHA, UNKNOWN_SHA],
  shortShas: ['aaaa000'],
  commentBodyOid: RICH_SHA,
};

const RELEASE_FIXTURE: ReferenceFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  routePath: 'releases/tag/v1.0.0',
  fullOids: [MALFORMED_SHA],
};

// The same commit referenced twice in separated rows: every qualified
// occurrence must chip, not one per storage key.
const DUPLICATE_FIXTURE: ReferenceFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  routePath: 'blame/main/CHANGELOG.md',
  fullOids: [RICH_SHA, UNKNOWN_SHA, RICH_SHA],
};

const RESULTS_DIR = join(process.cwd(), 'artifacts', 'test-results');
let harness: Harness;

before(async () => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  harness = await launchHarness(mkdtempSync(join(tmpdir(), 'tl-mem-')));
  await harness.serve([RICH_FIXTURE, MALFORMED_FIXTURE]);
  const routes = new Map([
    [referenceFixtureUrl(BLAME_FIXTURE), referenceFixtureHtml(BLAME_FIXTURE)],
    [referenceFixtureUrl(RELEASE_FIXTURE), referenceFixtureHtml(RELEASE_FIXTURE)],
    [referenceFixtureUrl(DUPLICATE_FIXTURE), referenceFixtureHtml(DUPLICATE_FIXTURE)],
  ]);
  await harness.serveRaw(routes);
});

after(async () => {
  await harness.close();
});

async function setMemoryEnabled(enabled: boolean): Promise<void> {
  const options = await harness.openOptionsPage();
  const checked = await options.isChecked('#tlo-memory');
  if (checked !== enabled) {
    await options.click('#tlo-memory');
    await options.click('#tlo-save');
    await options.waitForFunction(() => document.getElementById('tlo-status')?.textContent === 'Saved');
  }
  await options.close();
}

async function openAndSettle(url: string): Promise<Page> {
  const page = await harness.context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  return page;
}

test('memory off by default: commit visits learn nothing, references stay bare', async () => {
  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await commitPage.close();

  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  assert.equal(await blame.locator(CHIP).count(), 0);
  await blame.close();

  const options = await harness.openOptionsPage();
  assert.equal(await options.locator('#tlo-memory-stats').textContent(), 'Nothing remembered yet.');
  await options.close();
});

test('enabled: a visited commit is remembered and chips appear on references', async () => {
  await setMemoryEnabled(true);

  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await commitPage.waitForTimeout(600);
  await commitPage.close();

  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await blame.waitForSelector(CHIP, { timeout: 10000 });
  const state = await blame.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-trailer-lens="chip"]')];
    const chip = chips[0] as HTMLDetailsElement;
    chip.open = true;
    return {
      chipCount: chips.length,
      chipKey: chip.getAttribute('data-trailer-lens-commit'),
      afterQualifiedLink:
        chip.previousElementSibling?.querySelector('a')?.getAttribute('href') ??
        chip.previousElementSibling?.getAttribute('href') ??
        null,
      outsideClipper: chip.previousElementSibling?.classList.contains('ref-message') ?? false,
      painted: (() => {
        const r = chip.querySelector('.tl-chip-summary')?.getBoundingClientRect();
        if (r === undefined || r.width === 0) return 'zero-size';
        const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return at !== null && chip.contains(at) ? 'painted' : 'clipped';
      })(),
      count: chip.querySelector('.tl-chip-count')?.textContent,
      qualifier: chip.querySelector('.tl-chip-word')?.textContent,
      ariaLabel: chip.querySelector('.tl-chip-summary')?.getAttribute('aria-label'),
      tooltip: chip.querySelector('.tl-chip-summary')?.getAttribute('title'),
      labels: [...chip.querySelectorAll('.tl-label')].map((el) => el.textContent),
      note: chip.querySelector('.tl-remembered-note')?.textContent ?? '',
      inCommentBody: chips.some((c) => c.closest('.comment-body') !== null),
    };
  });
  // Exactly one chip: the qualified blame row. Unknown OID, short SHA, and
  // the comment-body link all stay bare.
  assert.equal(state.chipCount, 1);
  assert.equal(state.chipKey, `tlm:github.com/fixture-org/fixture-repo@${RICH_SHA}`);
  assert.equal(state.afterQualifiedLink, `/fixture-org/fixture-repo/commit/${RICH_SHA}`);
  // The blame message cell truncates with ellipsis exactly like GitHub's; a
  // chip left inside it would exist in the DOM yet never paint. It must sit
  // outside the clipper and win a hit test at its own center.
  assert.equal(state.outsideClipper, true);
  assert.equal(state.painted, 'painted');
  assert.equal(state.count, '7');
  // The collapsed pill must say what it is — memory, not live truth — and the
  // note must defuse the inference that a chip-less commit has no trailers.
  assert.equal(state.qualifier, 'remembered');
  assert.equal(state.ariaLabel, '7 remembered trailers for this commit');
  assert.equal(state.tooltip, 'Remembered on this device from a commit page you previously viewed');
  assert.deepEqual(state.labels, ['Co-authored by', 'Co-authored by', 'Reviewed by', 'Change-Id', 'Build-Context']);
  assert.ok(state.note.includes('Remembered on this device from a commit page you previously viewed'));
  assert.ok(state.note.includes('not that the commit has no trailers'));
  assert.equal(state.inCommentBody, false);

  await blame.screenshot({ path: join(RESULTS_DIR, 'memory-chip-blame.png'), fullPage: true });
  await blame.close();
});

test('every qualified occurrence of the same commit gets its own chip', async () => {
  const page = await openAndSettle(referenceFixtureUrl(DUPLICATE_FIXTURE));
  await page.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="chip"]').length === 2, undefined, {
    timeout: 10000,
  });

  // Repeated reconciliation must not collapse or duplicate the pair.
  await page.evaluate(() => document.body.append(document.createElement('div')));
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-trailer-lens="chip"]')];
    return {
      count: chips.length,
      rows: chips.map((chip) => chip.closest('.ref-row')?.getAttribute('data-row') ?? null),
      keys: [...new Set(chips.map((chip) => chip.getAttribute('data-trailer-lens-commit')))],
      painted: chips.map((chip) => {
        const r = chip.querySelector('.tl-chip-summary')?.getBoundingClientRect();
        if (r === undefined || r.width === 0) return 'zero-size';
        const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return at !== null && chip.contains(at) ? 'painted' : 'clipped';
      }),
    };
  });
  assert.equal(state.count, 2);
  assert.deepEqual(state.rows, ['0', '2'], 'each chip sits in its own referencing row');
  assert.equal(state.keys.length, 1, 'both occurrences share the one storage key');
  assert.deepEqual(state.painted, ['painted', 'painted']);

  // Removing one source anchor removes exactly its chip.
  await page.evaluate(() => {
    document.querySelector('.ref-row[data-row="0"] a')?.remove();
  });
  await page.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="chip"]').length === 1, undefined, {
    timeout: 10000,
  });
  const survivor = await page.evaluate(
    () => document.querySelector('[data-trailer-lens="chip"]')?.closest('.ref-row')?.getAttribute('data-row') ?? null,
  );
  assert.equal(survivor, '2', 'the untouched occurrence keeps its chip');
  await page.close();
});

test('remembered malformed evidence keeps its diagnostics on a release page', async () => {
  const commitPage = await harness.openCommitPage(MALFORMED_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });
  await commitPage.waitForTimeout(600);
  await commitPage.close();

  const release = await openAndSettle(referenceFixtureUrl(RELEASE_FIXTURE));
  await release.waitForSelector(CHIP, { timeout: 10000 });
  const diagnostics = await release.evaluate(() => {
    const chip = document.querySelector('[data-trailer-lens="chip"]') as HTMLDetailsElement;
    chip.open = true;
    return chip.querySelector('.tl-diagnostics .tl-raw-lines')?.textContent ?? null;
  });
  assert.equal(diagnostics, 'Co-authored-via: Juno | Claude Code | Opus 5 | Max');
  await release.close();
});

test('the open chip passes automated accessibility checks', async () => {
  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await blame.waitForSelector(CHIP, { timeout: 10000 });
  await blame.evaluate(() => {
    const chip = document.querySelector('[data-trailer-lens="chip"]') as HTMLDetailsElement;
    chip.open = true;
    const raw = chip.querySelector('.tl-raw') as HTMLDetailsElement | null;
    if (raw) raw.open = true;
  });
  const results = await new AxeBuilder({ page: blame }).include(CHIP).analyze();
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  assert.deepEqual(serious.map((v) => `${v.id}: ${v.description}`), []);
  await blame.close();
});

test('disabling memory removes chips live without purging the data', async () => {
  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await blame.waitForSelector(CHIP, { timeout: 10000 });

  await setMemoryEnabled(false);
  await blame.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="chip"]').length === 0, undefined, {
    timeout: 10000,
  });
  await blame.close();

  const options = await harness.openOptionsPage();
  const stats = await options.locator('#tlo-memory-stats').textContent();
  assert.ok(stats?.startsWith('Remembered: 2 commits'), `data must survive disable, saw: ${stats}`);
  await options.close();

  await setMemoryEnabled(true);
  const back = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await back.waitForSelector(CHIP, { timeout: 10000 });
  await back.close();
});

test('purges are exact, two-step where destructive, and reconcile open pages live', async () => {
  // The reference page stays open through every purge: chips must react to
  // the storage change itself, not to a later navigation.
  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await blame.waitForSelector(CHIP, { timeout: 10000 });

  const options = await harness.openOptionsPage();

  await options.fill('#tlo-purge-repo-input', 'not-a-repo');
  await options.click('#tlo-purge-repo-form button[type="submit"]');
  assert.equal(await options.locator('#tlo-purge-repo-error').isHidden(), false);

  // Purging an unrelated repository must leave the open page's chips alone.
  await options.fill('#tlo-purge-repo-input', 'unrelated/elsewhere');
  await options.click('#tlo-purge-repo-form button[type="submit"]');
  await options.waitForFunction(() =>
    document.getElementById('tlo-status')?.textContent?.includes('Nothing remembered for unrelated/elsewhere'),
  );
  await blame.waitForTimeout(700);
  assert.equal(await blame.locator(CHIP).count(), 1, 'unrelated purge leaves chips in place');

  await options.click('#tlo-purge-all');
  assert.equal(await options.locator('#tlo-purge-all').textContent(), 'Really purge all remembered evidence?');
  await options.click('#tlo-purge-all');
  await options.waitForFunction(() =>
    document.getElementById('tlo-status')?.textContent?.startsWith('Purged 2 remembered commits'),
  );
  await options.waitForFunction(
    () => document.getElementById('tlo-memory-stats')?.textContent === 'Nothing remembered yet.',
  );
  await options.close();

  await blame.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="chip"]').length === 0, undefined, {
    timeout: 10000,
  });
  await blame.close();
});

test('evidence learned in another tab appears on an already-open reference page', async () => {
  // Fresh purged state from the previous test; memory is still enabled.
  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  assert.equal(await blame.locator(CHIP).count(), 0, 'nothing remembered at the start');

  const commitPage = await harness.openCommitPage(RICH_FIXTURE);
  await commitPage.waitForSelector(OWNED_ROOT, { timeout: 10000 });

  await blame.waitForSelector(CHIP, { timeout: 15000 });
  await commitPage.close();
  await blame.close();
});

test('a chip disappears when its stored record turns malformed', async () => {
  // RICH is remembered again from the previous test; its chip renders.
  const blame = await openAndSettle(referenceFixtureUrl(BLAME_FIXTURE));
  await blame.waitForSelector(CHIP, { timeout: 10000 });

  // Corrupt the record in place — same schema version, malformed evidence.
  // The open page must reconcile the stale chip away (storage change →
  // schedule → deep validation treats the record as a miss).
  const options = await harness.openOptionsPage();
  await options.evaluate(
    (sha) =>
      new Promise<void>((resolve) =>
        chrome.storage.local.set(
          {
            [`tlm:github.com/fixture-org/fixture-repo@${sha}`]: {
              schema: 1,
              storedAt: 1,
              hasRenderedLinks: false,
              evidence: {},
            },
          },
          () => resolve(),
        ),
      ),
    RICH_SHA,
  );
  await options.close();

  await blame.waitForFunction(() => document.querySelectorAll('[data-trailer-lens="chip"]').length === 0, undefined, {
    timeout: 10000,
  });
  await blame.close();
});

test('the memory suite made zero external requests', () => {
  assert.deepEqual(harness.externalRequests, []);
});
