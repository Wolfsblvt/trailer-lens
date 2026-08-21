/**
 * Device-local trailer memory: the stored envelope and its bounds.
 *
 * Memory is an explicit opt-in (off by default). What is stored is the
 * smallest lossless envelope that reproduces the panel for one commit —
 * the parsed evidence and its rendering metadata — never the whole commit
 * message. Entries live in `chrome.storage.local` only: no sync storage,
 * no page storage, no network, device-local by design.
 */

import type { TrailerEvidence } from '../domain/trailers/model.ts';

/**
 * Version of the stored envelope's contract. Bump when `TrailerEvidence`,
 * the renderer's expectations, or the key scheme change shape; entries with
 * another version are treated as misses and eligible for eviction, never
 * migrated speculatively.
 */
export const MEMORY_SCHEMA_VERSION = 1;

/** One remembered commit's evidence envelope. */
export interface MemoryEntry {
  readonly schema: typeof MEMORY_SCHEMA_VERSION;
  /** Parsed evidence exactly as the panel renders it. */
  readonly evidence: TrailerEvidence;
  /** Whether the source page rendered links inside the message. */
  readonly hasRenderedLinks: boolean;
  /** When this commit's evidence was learned (epoch milliseconds). */
  readonly storedAt: number;
}

export const MEMORY_LIMITS = {
  /**
   * Maximum remembered commits. At the measured ordinary envelope size
   * (see docs/DECISIONS.md; sub-kilobyte for typical blocks, a few KB for
   * large ones) this keeps the cache well under half of the ~10 MB
   * `chrome.storage.local` quota even in pathological repositories.
   */
  maxEntries: 1500,
  /** Entries removed in one eviction pass once the cap is exceeded. */
  evictionBatch: 100,
  /** A single serialized entry larger than this is not stored at all. */
  maxEntryBytes: 32_768,
} as const;

/** True when a stored value is a well-formed current-schema entry. */
export function isValidMemoryEntry(value: unknown): value is MemoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    entry['schema'] === MEMORY_SCHEMA_VERSION &&
    typeof entry['storedAt'] === 'number' &&
    typeof entry['hasRenderedLinks'] === 'boolean' &&
    typeof entry['evidence'] === 'object' &&
    entry['evidence'] !== null
  );
}
