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

(globalThis as Record<string, unknown>)['chrome'] = {
  runtime: { lastError: undefined },
  storage: {
    local: {
      get(keys: string[] | null, callback: (items: Record<string, unknown>) => void): void {
        const items: Record<string, unknown> = {};
        for (const key of keys === null ? [...backing.keys()] : keys) {
          if (backing.has(key)) items[key] = clone(backing.get(key));
        }
        callback(items);
      },
      set(items: Record<string, unknown>, callback: () => void): void {
        for (const [key, value] of Object.entries(items)) backing.set(key, clone(value));
        callback();
      },
      remove(keys: string[], callback: () => void): void {
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
});

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
  assert.equal(stats.entries, total - removed);
  assert.equal(await recallEvidence({ ...identityA, oid: (removed - 1).toString(16).padStart(40, '0') }), null);
  assert.ok(await recallEvidence({ ...identityA, oid: removed.toString(16).padStart(40, '0') }));
  assert.ok(await recallEvidence({ ...identityA, oid: newestOid }), 'the newest entry always survives');
});

test('purges are exact and never touch settings', async () => {
  backing.set('settings', { version: 2, enabled: true });
  const evidence = parseTrailerEvidence('Subject\n\nBody.\n\nReviewed-by: A <a@b.co>\n');
  await rememberEvidence(identityA, evidence, false, 1);
  await rememberEvidence({ ...identityA, repo: 'other' }, evidence, false, 2);
  await rememberEvidence({ host: 'github.com', owner: 'someone', repo: 'else', oid: OID_B }, evidence, false, 3);

  assert.equal(await purgeRepository('github.com', 'ACME', 'Weather'), 1, 'repository purge is case-insensitive');
  assert.equal((await memoryStats()).entries, 2);

  assert.equal(await purgeAll(), 2);
  assert.equal((await memoryStats()).entries, 0);
  assert.deepEqual(backing.get('settings'), { version: 2, enabled: true }, 'settings survive every purge');
});
