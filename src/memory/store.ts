/**
 * Memory store: bounded, deterministic, honest.
 *
 * Every remembered commit is one `chrome.storage.local` key (`tlm:…`), so
 * settings and memory stay separately owned records — a malformed cache
 * entry can never reset user preferences. Retention is quota-aware and
 * deterministic: when the entry cap is exceeded, the oldest `storedAt`
 * entries are evicted first (ties broken by key order). Purge is per
 * repository or complete, and both work regardless of the enable state.
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

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(items, () => {
    // A quota or serialization failure must never break the page; the
    // entry simply is not remembered.
    void chrome.runtime.lastError;
    resolve();
  }));
}

function storageRemove(keys: string[]): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove(keys, () => {
    void chrome.runtime.lastError;
    resolve();
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
 * than stored partially; the cap triggers deterministic eviction.
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
  if (JSON.stringify(entry).length > MEMORY_LIMITS.maxEntryBytes) return;
  await storageSet({ [key]: entry });
  await evictIfNeeded();
}

/** Deterministic retention: oldest `storedAt` first, key order as tiebreak. */
async function evictIfNeeded(): Promise<void> {
  const items = await storageGet(null);
  const memory = Object.entries(items)
    .filter(([key]) => parseMemoryKey(key) !== null)
    .map(([key, value]) => ({ key, storedAt: isValidMemoryEntry(value) ? value.storedAt : 0 }));
  if (memory.length <= MEMORY_LIMITS.maxEntries) return;
  memory.sort((a, b) => a.storedAt - b.storedAt || (a.key < b.key ? -1 : 1));
  const excess = memory.length - MEMORY_LIMITS.maxEntries + MEMORY_LIMITS.evictionBatch;
  await storageRemove(memory.slice(0, excess).map((entry) => entry.key));
}

/** Current entry count and approximate serialized size. */
export async function memoryStats(): Promise<MemoryStats> {
  const items = await storageGet(null);
  let entries = 0;
  let approximateBytes = 0;
  for (const [key, value] of Object.entries(items)) {
    if (parseMemoryKey(key) === null) continue;
    entries++;
    approximateBytes += key.length + JSON.stringify(value).length;
  }
  return { entries, approximateBytes };
}

/** Remove every remembered commit for one exact `owner/repo` on a host. */
export async function purgeRepository(host: string, owner: string, repo: string): Promise<number> {
  const keys = (await allMemoryKeys()).filter((key) => {
    const identity = parseMemoryKey(key);
    return (
      identity !== null &&
      identity.host === host.toLowerCase() &&
      identity.owner.toLowerCase() === owner.toLowerCase() &&
      identity.repo.toLowerCase() === repo.toLowerCase()
    );
  });
  await storageRemove(keys);
  return keys.length;
}

/** Remove everything remembered. Settings are untouched by construction. */
export async function purgeAll(): Promise<number> {
  const keys = await allMemoryKeys();
  await storageRemove(keys);
  return keys.length;
}
