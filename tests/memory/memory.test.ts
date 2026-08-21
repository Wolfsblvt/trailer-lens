/**
 * Device-local memory: key discipline, lossless round-trips, deterministic
 * eviction, and purge custody — against an in-memory chrome.storage stub.
 * The identity rules are the safety core: no short SHA ever becomes a key,
 * and repository identity always comes from the link's own href.
 */

import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { parseTrailerEvidence } from '../../src/domain/trailers/parse.ts';
import { identityFromCommitHref, memoryKey, parseMemoryKey } from '../../src/memory/keys.ts';
import { MEMORY_LIMITS } from '../../src/memory/model.ts';
import {
  memoryStats,
  purgeAll,
  purgeRepository,
  recallEvidence,
  recallMany,
  rememberEvidence,
} from '../../src/memory/store.ts';

// ----- chrome.storage.local stub -----

const backing = new Map<string, unknown>();
const clone = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const runtimeStub: { lastError: { message: string } | undefined } = { lastError: undefined };
let failingSetsRemaining = 0;
let failingRemovesRemaining = 0;
let failingGetsRemaining = 0;

(globalThis as Record<string, unknown>)['chrome'] = {
  runtime: runtimeStub,
  storage: {
    local: {
      get(keys: string[] | null, callback: (items: Record<string, unknown>) => void): void {
        if (failingGetsRemaining > 0) {
          failingGetsRemaining--;
          runtimeStub.lastError = { message: 'storage failure' };
          callback({});
          runtimeStub.lastError = undefined;
          return;
        }
        const items: Record<string, unknown> = {};
        for (const key of keys === null ? [...backing.keys()] : keys) {
          if (backing.has(key)) items[key] = clone(backing.get(key));
        }
        callback(items);
      },
      set(items: Record<string, unknown>, callback: () => void): void {
        if (failingSetsRemaining > 0) {
          failingSetsRemaining--;
          runtimeStub.lastError = { message: 'QUOTA_BYTES quota exceeded' };
          callback();
          runtimeStub.lastError = undefined;
          return;
        }
        for (const [key, value] of Object.entries(items)) backing.set(key, clone(value));
        callback();
      },
      remove(keys: string[], callback: () => void): void {
        if (failingRemovesRemaining > 0) {
          failingRemovesRemaining--;
          runtimeStub.lastError = { message: 'storage failure' };
          callback();
          runtimeStub.lastError = undefined;
          return;
        }
        for (const key of keys) backing.delete(key);
        callback();
      },
    },
  },
};

const OID_A = 'a'.repeat(40);
const OID_B = 'b'.repeat(40);
const identityA = { host: 'github.com', owner: 'acme', repo: 'weather', oid: OID_A };

beforeEach(() => {
  backing.clear();
  failingSetsRemaining = 0;
  failingRemovesRemaining = 0;
  failingGetsRemaining = 0;
});

/** Serialized size the store accounts for: key + JSON value, UTF-8 bytes. */
function storedBytes(key: string, value: unknown): number {
  return new TextEncoder().encode(key).length + new TextEncoder().encode(JSON.stringify(value)).length;
}

// ----- keys -----

test('memory keys round-trip and refuse partial identity', () => {
  const key = memoryKey(identityA);
  assert.equal(key, `tlm:github.com/acme/weather@${OID_A}`);
  assert.deepEqual(parseMemoryKey(key as string), identityA);

  assert.equal(memoryKey({ ...identityA, oid: 'abc1234' }), null, 'short SHA is never a key');
  assert.equal(memoryKey({ ...identityA, oid: OID_A.toUpperCase() }), `tlm:github.com/acme/weather@${OID_A}`);
  assert.equal(memoryKey({ ...identityA, owner: '' }), null);
  assert.equal(memoryKey({ ...identityA, repo: 'a/b' }), null);
  assert.equal(parseMemoryKey('settings'), null);
  assert.equal(parseMemoryKey('tlm:github.com/acme/weather@abc1234'), null);
});

test('identityFromCommitHref accepts only full-OID commit links', () => {
  assert.deepEqual(identityFromCommitHref(`/acme/weather/commit/${OID_A}`, 'github.com'), identityA);
  assert.deepEqual(identityFromCommitHref(`/acme/weather/pull/7/commits/${OID_A}`, 'github.com'), identityA);
  // Cross-repository absolute links key to their own repository.
  assert.deepEqual(identityFromCommitHref(`https://github.com/other/repo/commit/${OID_B}`, 'github.com'), {
    host: 'github.com',
    owner: 'other',
    repo: 'repo',
    oid: OID_B,
  });
  assert.equal(identityFromCommitHref('/acme/weather/commit/abc1234', 'github.com'), null, 'short SHA refused');
  assert.equal(identityFromCommitHref('/acme/weather/commits/main', 'github.com'), null);
  assert.equal(identityFromCommitHref(`/acme/weather/tree/${OID_A}`, 'github.com'), null);
  assert.equal(identityFromCommitHref('not a url ::', 'github.com'), null);
  assert.equal(
    identityFromCommitHref(`/acme/weather/commit/${OID_A}.patch`, 'github.com'),
    null,
    'derived-file routes are not the commit page identity',
  );
});

// ----- store round-trip -----

test('remembered evidence round-trips losslessly, including rich shapes', async () => {
  const message = [
    'Integrate review findings',
    '',
    'Body.',
    '',
    'Co-authored-via: Tala | Claude Code | Fable 5 | High',
    'Co-authored-via: Juno | Claude Code | Opus 5 | Max',
    'Co-authored-by: Tala <tala@example.com>',
    'Co-authored-by: Juno <juno@example.com>',
    'reviewed-BY: Alex <alex@example.com>',
    'Build-Context: windows-x64 | release',
  ].join('\n');
  const evidence = parseTrailerEvidence(message);
  await rememberEvidence(identityA, evidence, true, 1000);

  const entry = await recallEvidence(identityA);
  assert.ok(entry);
  assert.equal(entry.hasRenderedLinks, true);
  assert.equal(entry.storedAt, 1000);
  assert.deepEqual(entry.evidence, evidence, 'the envelope reproduces the parsed evidence exactly');
});

test('malformed-canary evidence keeps its candidates through the cache', async () => {
  const evidence = parseTrailerEvidence(
    'Subject\n\nBody.\n\nCo-authored-via: Juno | Claude Code | Opus 5 | Max\n\nCo-authored-by: Juno <juno@example.com>\n',
  );
  await rememberEvidence(identityA, evidence, false, 5);
  const entry = await recallEvidence(identityA);
  assert.equal(entry?.evidence.nearbyCandidates.length, 1);
  assert.deepEqual(
    entry?.evidence.diagnostics.map((diagnostic) => diagnostic.code),
    ['outside-final-block'],
  );
});

test('misses, foreign schemas, and oversized envelopes stay out', async () => {
  assert.equal(await recallEvidence(identityA), null);

  backing.set(memoryKey(identityA) as string, { schema: 999, evidence: {}, hasRenderedLinks: false, storedAt: 1 });
  assert.equal(await recallEvidence(identityA), null, 'foreign schema is a miss, never migrated speculatively');

  // The parser's own tail bound already blocks giant single messages, so an
  // oversized envelope needs many large entries; the store cap is the second
  // line of defense and must hold on its own.
  const block = Array.from({ length: 20 }, (_, i) => `Key-${i}: ${'x'.repeat(800)}`).join('\n');
  const huge = parseTrailerEvidence(`Subject\n\nBody.\n\n${block}\n`);
  assert.ok(JSON.stringify(huge).length * 2 > MEMORY_LIMITS.maxEntryBytes, 'fixture must exceed the entry cap');
  await rememberEvidence({ ...identityA, oid: OID_B }, huge, false, 2);
  assert.equal(await recallEvidence({ ...identityA, oid: OID_B }), null, 'oversized envelope is not stored');
});

test('recallMany returns exactly the hits', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence(identityA, evidence, false, 1);
  const found = await recallMany([identityA, { ...identityA, oid: OID_B }]);
  assert.equal(found.size, 1);
  assert.ok(found.has(memoryKey(identityA) as string));
});

// ----- retention and purge -----

test('eviction is deterministic: oldest storedAt leaves first', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  // Seed just below the trigger directly, then one real remember tips it.
  const seeded = MEMORY_LIMITS.maxEntries + 4;
  for (let i = 0; i < seeded; i++) {
    const oid = i.toString(16).padStart(40, '0');
    backing.set(memoryKey({ ...identityA, oid }) as string, {
      schema: 1,
      evidence,
      hasRenderedLinks: false,
      storedAt: i,
    });
  }
  const newestOid = seeded.toString(16).padStart(40, '0');
  await rememberEvidence({ ...identityA, oid: newestOid }, evidence, false, seeded);

  const total = seeded + 1;
  const removed = total - MEMORY_LIMITS.maxEntries + MEMORY_LIMITS.evictionBatch;
  const stats = await memoryStats();
  assert.ok(stats, 'stats read succeeds');
  assert.equal(stats.entries, total - removed);
  assert.equal(await recallEvidence({ ...identityA, oid: (removed - 1).toString(16).padStart(40, '0') }), null);
  assert.ok(await recallEvidence({ ...identityA, oid: removed.toString(16).padStart(40, '0') }));
  assert.ok(await recallEvidence({ ...identityA, oid: newestOid }), 'the newest entry always survives');
});

test('malformed current-schema entries are deep-validated misses, still purgeable', async () => {
  const key = memoryKey(identityA) as string;
  const wrap = (evidence: unknown, storedAt = 1): unknown => ({
    schema: 1,
    storedAt,
    hasRenderedLinks: false,
    evidence,
  });

  backing.set(key, wrap({}));
  assert.equal(await recallEvidence(identityA), null, 'empty evidence object is a miss');

  backing.set(key, wrap({ strictBlock: null, nearbyCandidates: [{}], diagnostics: [] }));
  assert.equal(await recallEvidence(identityA), null, 'malformed nested candidate is a miss');

  backing.set(
    key,
    wrap({ strictBlock: { rawText: 'K: v', startLine: 0, endLine: 0, entries: [{}], recognition: 'all-trailer-lines' }, nearbyCandidates: [], diagnostics: [] }),
  );
  assert.equal(await recallEvidence(identityA), null, 'malformed nested block entry is a miss');

  backing.set(key, wrap({ strictBlock: null, nearbyCandidates: [], diagnostics: [] }, Number.POSITIVE_INFINITY));
  assert.equal(await recallEvidence(identityA), null, 'non-finite timestamp is a miss');

  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  backing.set(key, wrap(evidence));
  assert.ok(await recallEvidence(identityA), 'genuinely valid shapes still recall — the validator is not overzealous');

  backing.set(key, wrap({}));
  assert.equal(await purgeAll(), 1, 'malformed entries remain purgeable');
});

test('entry size is measured in UTF-8 bytes, not characters', async () => {
  // '€' serializes to 3 UTF-8 bytes. The envelope carries the value roughly
  // four times (rawValue, unfoldedValue, rawLines, block rawText), so 4000
  // euro signs keep the character length far under the cap while the byte
  // length exceeds it — the exact case a character count would mis-admit.
  const evidence = parseTrailerEvidence(`Subject\n\nBody.\n\nKey-One: ${'€'.repeat(4000)}\n`);
  const entry = { schema: 1, evidence, hasRenderedLinks: false, storedAt: 1 };
  assert.ok(JSON.stringify(entry).length < MEMORY_LIMITS.maxEntryBytes, 'fixture stays under the cap in characters');
  assert.ok(
    new TextEncoder().encode(JSON.stringify(entry)).length > MEMORY_LIMITS.maxEntryBytes,
    'fixture exceeds the cap in bytes',
  );
  await rememberEvidence(identityA, evidence, false, 1);
  assert.equal(await recallEvidence(identityA), null, 'byte-measured oversize is dropped');
});

test('the total byte budget evicts oldest-first before the count cap is near', async () => {
  // Mixed ordinary and Unicode-heavy entries of ~20–30 KB each: far fewer
  // than 1500 of them exceed the 3 MB budget, and the multi-byte entries
  // only account correctly when measured in encoded bytes.
  const asciiEvidence = parseTrailerEvidence(`Subject\n\nBody.\n\nBulk-Data: ${'x'.repeat(6000)}\n`);
  const unicodeEvidence = parseTrailerEvidence(`Subject\n\nBody.\n\nBulk-Data: ${'€'.repeat(2500)}\n`);
  const evidenceFor = (i: number): unknown => (i % 2 === 0 ? asciiEvidence : unicodeEvidence);
  const entryFor = (i: number): unknown => ({ schema: 1, evidence: evidenceFor(i), hasRenderedLinks: false, storedAt: i });
  const keyFor = (i: number): string => memoryKey({ ...identityA, oid: i.toString(16).padStart(40, '0') }) as string;

  let seeded = 0;
  let seededBytes = 0;
  while (seededBytes <= MEMORY_LIMITS.maxTotalBytes + 60_000) {
    backing.set(keyFor(seeded), entryFor(seeded));
    seededBytes += storedBytes(keyFor(seeded), entryFor(seeded));
    seeded++;
  }

  await rememberEvidence({ ...identityA, oid: 'f'.repeat(40) }, asciiEvidence, false, seeded);

  const stats = await memoryStats();
  assert.ok(stats, 'stats read succeeds');
  assert.ok(stats.approximateBytes <= MEMORY_LIMITS.maxTotalBytes, 'total stays within the budget after the write');
  assert.ok(stats.entries < seeded + 1, 'something was evicted');
  assert.ok(await recallEvidence({ ...identityA, oid: 'f'.repeat(40) }), 'the new entry was retained');
  const evicted = seeded + 1 - stats.entries;
  for (let i = 0; i < evicted; i++) {
    assert.equal(await recallEvidence({ ...identityA, oid: i.toString(16).padStart(40, '0') }), null, `oldest ${i} evicted`);
  }
  assert.ok(await recallEvidence({ ...identityA, oid: evicted.toString(16).padStart(40, '0') }), 'survivor boundary is deterministic');
});

test('a quota failure evicts one batch and retries instead of pretending', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  for (let i = 0; i < 10; i++) {
    backing.set(memoryKey({ ...identityA, oid: i.toString(16).padStart(40, '0') }) as string, {
      schema: 1,
      evidence,
      hasRenderedLinks: false,
      storedAt: i,
    });
  }
  failingSetsRemaining = 1;
  assert.equal(
    await rememberEvidence({ ...identityA, oid: 'f'.repeat(40) }, evidence, false, 99),
    true,
    'a first-fail/second-success write reports retention',
  );
  assert.ok(await recallEvidence({ ...identityA, oid: 'f'.repeat(40) }), 'the entry is stored on the retry');
  assert.equal(
    await recallEvidence({ ...identityA, oid: '0'.repeat(40) }),
    null,
    'the eviction batch removed the oldest entries first',
  );
});

test('two rejected writes report a truthful not-remembered outcome', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  failingSetsRemaining = 2;
  assert.equal(
    await rememberEvidence(identityA, evidence, false, 1),
    false,
    'the bounded retry exhausting reports not-remembered, never silence',
  );
  assert.equal(await recallEvidence(identityA), null, 'nothing was retained');
  assert.equal(
    await rememberEvidence(identityA, evidence, false, 2),
    true,
    'the store recovers normally afterwards',
  );
});

test('repository case never fragments identity', async () => {
  // GitHub serves mixed-case repository routes without a canonical redirect,
  // so the same repository must produce one key regardless of route case.
  assert.equal(
    memoryKey({ host: 'GitHub.com', owner: 'ACME', repo: 'Weather', oid: OID_A.toUpperCase() }),
    `tlm:github.com/acme/weather@${OID_A}`,
  );
  assert.deepEqual(identityFromCommitHref(`/ACME/Weather/commit/${OID_A}`, 'github.com'), identityA);

  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence({ host: 'github.com', owner: 'ACME', repo: 'Weather', oid: OID_A }, evidence, false, 1);
  assert.ok(await recallEvidence(identityA), 'mixed-case learn recalls under canonical identity');
  assert.equal(await purgeRepository('github.com', 'acme', 'WEATHER'), 1, 'mixed-case purge finds it too');
});

test('a failed discovery read reports purge failure, never a zero-removal success', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence(identityA, evidence, false, 1);

  failingGetsRemaining = 1;
  assert.equal(await purgeAll(), null, 'an unknown store is a failed purge, not "nothing remembered"');
  const after = await memoryStats();
  assert.equal(after?.entries, 1, 'the evidence is honestly still there');

  failingGetsRemaining = 1;
  assert.equal(await purgeRepository('github.com', 'acme', 'weather'), null, 'per-repository purge fails the same way');

  failingGetsRemaining = 1;
  assert.equal(await memoryStats(), null, 'a failed read never renders as an empty store');
});

test('a rejected removal reports failure instead of a purge that did not happen', async () => {
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence(identityA, evidence, false, 1);
  failingRemovesRemaining = 1;
  assert.equal(await purgeAll(), null, 'the failed purge is reported as null, never a count');
  assert.equal((await memoryStats())?.entries, 1, 'the evidence is honestly still there');
  assert.equal(await purgeAll(), 1, 'the next attempt succeeds normally');
});

test('purges are exact and never touch settings', async () => {
  backing.set('settings', { version: 2, enabled: true });
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence(identityA, evidence, false, 1);
  await rememberEvidence({ ...identityA, repo: 'other' }, evidence, false, 2);
  await rememberEvidence({ host: 'github.com', owner: 'someone', repo: 'else', oid: OID_B }, evidence, false, 3);

  assert.equal(await purgeRepository('github.com', 'ACME', 'Weather'), 1, 'repository purge is case-insensitive');
  assert.equal((await memoryStats())?.entries, 2);

  assert.equal(await purgeAll(), 2);
  assert.equal((await memoryStats())?.entries, 0);
  assert.deepEqual(backing.get('settings'), { version: 2, enabled: true }, 'settings survive every purge');
});
