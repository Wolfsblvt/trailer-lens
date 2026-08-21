/**
 * Memory store: bounded, deterministic, honest.
 *
 * Every remembered commit is one `chrome.storage.local` key (`tlm:…`), so
 * settings and memory stay separately owned records — a malformed cache
 * entry can never reset user preferences. Retention enforces both an entry
 * cap and a total serialized byte budget with headroom below Chrome's
 * 10 MB `storage.local` quota: before a write, the oldest `storedAt`
 * entries are evicted (ties broken by key order) until the new entry fits
 * both bounds, and a quota failure that still slips through evicts one
 * batch and retries once rather than pretending the entry was retained.
 * Purge is per repository or complete, and both work regardless of the
 * enable state.
 */

import { isValidMemoryEntry, MEMORY_LIMITS, MEMORY_SCHEMA_VERSION, type MemoryEntry } from './model.ts';
import { memoryKey, parseMemoryKey, type CommitIdentity } from './keys.ts';
import type { TrailerEvidence } from '../domain/trailers/model.ts';

export interface MemoryStats {
  readonly entries: number;
  readonly approximateBytes: number;
}

function storageGet(keys: string[] | null): Promise<Record<string, unknown>> {
  return new Promise((resolve) => chrome.storage.local.get(keys, (items) => resolve(items ?? {})));
}

/** Resolves false on a quota or serialization failure instead of throwing. */
function storageSet(items: Record<string, unknown>): Promise<boolean> {
  return new Promise((resolve) => chrome.storage.local.set(items, () => {
    resolve(chrome.runtime.lastError === undefined || chrome.runtime.lastError === null);
  }));
}

/** UTF-8 bytes of a string — the honest measure for quota arithmetic. */
function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Serialized size of one stored entry as key + JSON value, in bytes. */
function entryBytes(key: string, value: unknown): number {
  return utf8Bytes(key) + utf8Bytes(JSON.stringify(value) ?? '');
}

/** Resolves false when the removal was rejected instead of throwing. */
function storageRemove(keys: string[]): Promise<boolean> {
  return new Promise((resolve) => chrome.storage.local.remove(keys, () => {
    resolve(chrome.runtime.lastError === undefined || chrome.runtime.lastError === null);
  }));
}

async function allMemoryKeys(): Promise<string[]> {
  const items = await storageGet(null);
  return Object.keys(items).filter((key) => parseMemoryKey(key) !== null);
}

/** Look up one commit's remembered evidence; misses and foreign schemas are null. */
export async function recallEvidence(identity: CommitIdentity): Promise<MemoryEntry | null> {
  const key = memoryKey(identity);
  if (key === null) return null;
  const items = await storageGet([key]);
  const value = items[key];
  return isValidMemoryEntry(value) ? value : null;
}

/** Batched lookup for reference surfaces with several links per page. */
export async function recallMany(identities: readonly CommitIdentity[]): Promise<Map<string, MemoryEntry>> {
  const keys = identities.map((identity) => memoryKey(identity)).filter((key): key is string => key !== null);
  const found = new Map<string, MemoryEntry>();
  if (keys.length === 0) return found;
  const items = await storageGet([...new Set(keys)]);
  for (const [key, value] of Object.entries(items)) {
    if (isValidMemoryEntry(value)) found.set(key, value);
  }
  return found;
}

/**
 * Remember one commit's evidence. Oversized envelopes are dropped rather
 * than stored partially. Before the write, the oldest entries are evicted
 * until the new entry fits both the count cap and the byte budget; a quota
 * failure that still occurs evicts one batch and retries once.
 */
export async function rememberEvidence(
  identity: CommitIdentity,
  evidence: TrailerEvidence,
  hasRenderedLinks: boolean,
  now: number,
): Promise<void> {
  const key = memoryKey(identity);
  if (key === null) return;
  const entry: MemoryEntry = { schema: MEMORY_SCHEMA_VERSION, evidence, hasRenderedLinks, storedAt: now };
  if (utf8Bytes(JSON.stringify(entry)) > MEMORY_LIMITS.maxEntryBytes) return;
  const pendingBytes = entryBytes(key, entry);
  await evictToFit(pendingBytes, key);
  const stored = await storageSet({ [key]: entry });
  if (!stored) {
    await evictOldest(MEMORY_LIMITS.evictionBatch, key);
    await storageSet({ [key]: entry });
  }
}

interface SizedMemoryRecord {
  readonly key: string;
  readonly storedAt: number;
  readonly bytes: number;
}

/** All memory records with sizes, oldest first (key order as tiebreak). */
async function sizedMemoryOldestFirst(excludeKey: string | null): Promise<SizedMemoryRecord[]> {
  const items = await storageGet(null);
  const memory = Object.entries(items)
    .filter(([key]) => parseMemoryKey(key) !== null && key !== excludeKey)
    .map(([key, value]) => ({
      key,
      storedAt: isValidMemoryEntry(value) ? value.storedAt : 0,
      bytes: entryBytes(key, value),
    }));
  memory.sort((a, b) => a.storedAt - b.storedAt || (a.key < b.key ? -1 : 1));
  return memory;
}

/**
 * Deterministic retention: evict oldest `storedAt` first until a pending
 * entry of `pendingBytes` fits both the count cap and the byte budget. A
 * count-triggered eviction removes an extra batch as hysteresis so ordinary
 * browsing does not evict on every learned commit.
 */
async function evictToFit(pendingBytes: number, pendingKey: string): Promise<void> {
  const memory = await sizedMemoryOldestFirst(pendingKey);
  let count = memory.length;
  let totalBytes = memory.reduce((sum, record) => sum + record.bytes, 0);
  const overCount = count + 1 > MEMORY_LIMITS.maxEntries;
  const targetCount = overCount ? MEMORY_LIMITS.maxEntries - MEMORY_LIMITS.evictionBatch : MEMORY_LIMITS.maxEntries;
  const doomed: string[] = [];
  for (const record of memory) {
    if (count < targetCount && totalBytes + pendingBytes <= MEMORY_LIMITS.maxTotalBytes) break;
    doomed.push(record.key);
    count--;
    totalBytes -= record.bytes;
  }
  if (doomed.length > 0) await storageRemove(doomed);
}

/** Remove the N oldest memory records (quota-failure fallback). */
async function evictOldest(n: number, excludeKey: string): Promise<void> {
  const memory = await sizedMemoryOldestFirst(excludeKey);
  await storageRemove(memory.slice(0, n).map((record) => record.key));
}

/** Current entry count and serialized size in UTF-8 bytes. */
export async function memoryStats(): Promise<MemoryStats> {
  const items = await storageGet(null);
  let entries = 0;
  let approximateBytes = 0;
  for (const [key, value] of Object.entries(items)) {
    if (parseMemoryKey(key) === null) continue;
    entries++;
    approximateBytes += entryBytes(key, value);
  }
  return { entries, approximateBytes };
}

/**
 * Remove every remembered commit for one exact `owner/repo` on a host.
 * Returns the removed count, or null when Chrome rejected the removal —
 * the caller must not report a purge that did not happen.
 */
export async function purgeRepository(host: string, owner: string, repo: string): Promise<number | null> {
  const keys = (await allMemoryKeys()).filter((key) => {
    const identity = parseMemoryKey(key);
    return (
      identity !== null &&
      identity.host === host.toLowerCase() &&
      identity.owner.toLowerCase() === owner.toLowerCase() &&
      identity.repo.toLowerCase() === repo.toLowerCase()
    );
  });
  const removed = await storageRemove(keys);
  return removed ? keys.length : null;
}

/**
 * Remove everything remembered. Settings are untouched by construction.
 * Returns the removed count, or null when Chrome rejected the removal.
 */
export async function purgeAll(): Promise<number | null> {
  const keys = await allMemoryKeys();
  const removed = await storageRemove(keys);
  return removed ? keys.length : null;
}
