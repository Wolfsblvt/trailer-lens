/**
 * Device-local trailer memory: the stored envelope and its bounds.
 *
 * Memory is an explicit opt-in (off by default). What is stored is the
 * smallest lossless envelope that reproduces the panel for one commit —
 * the parsed evidence and its rendering metadata — never the whole commit
 * message. Entries live in `chrome.storage.local` only: no sync storage,
 * no page storage, no network, device-local by design.
 */

import type {
  TrailerBlock,
  TrailerCandidate,
  TrailerDiagnostic,
  TrailerEntry,
  TrailerEvidence,
} from '../domain/trailers/model.ts';

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
  /** Maximum remembered commits, enforced together with the byte budget. */
  maxEntries: 1500,
  /** Entries removed in one count-triggered eviction pass (hysteresis). */
  evictionBatch: 100,
  /** A single serialized entry larger than this is not stored at all. */
  maxEntryBytes: 32_768,
  /**
   * Total serialized budget (keys + values, UTF-8 bytes) for all memory
   * entries. Chrome's `storage.local` quota is 10 MB without the
   * `unlimitedStorage` permission (which this product refuses); the budget
   * leaves generous headroom for settings and quota accounting overhead.
   * Eviction is oldest-`storedAt`-first until both count and bytes fit.
   */
  maxTotalBytes: 3_000_000,
} as const;

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isLineNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown, maxItems: number, maxLength: number): value is readonly string[] {
  return (
    Array.isArray(value) && value.length <= maxItems && value.every((item) => isBoundedString(item, maxLength))
  );
}

function isValidEntryShape(value: unknown): value is TrailerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    isBoundedString(entry['rawKey'], 256) &&
    isBoundedString(entry['normalizedKey'], 256) &&
    isBoundedString(entry['rawValue'], 8192) &&
    isBoundedString(entry['unfoldedValue'], 8192) &&
    isStringArray(entry['rawLines'], 64, 8192) &&
    isLineNumber(entry['startLine']) &&
    isLineNumber(entry['endLine'])
  );
}

function isValidBlockShape(value: unknown): value is TrailerBlock {
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  return (
    isBoundedString(block['rawText'], 32_768) &&
    isLineNumber(block['startLine']) &&
    isLineNumber(block['endLine']) &&
    Array.isArray(block['entries']) &&
    block['entries'].length <= 256 &&
    block['entries'].every(isValidEntryShape) &&
    (block['recognition'] === 'all-trailer-lines' || block['recognition'] === 'recognized-prefix-mixed')
  );
}

function isValidCandidateShape(value: unknown): value is TrailerCandidate {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isBoundedString(candidate['rawLine'], 8192) &&
    isLineNumber(candidate['line']) &&
    isBoundedString(candidate['rawKey'], 256) &&
    isBoundedString(candidate['normalizedKey'], 256) &&
    isBoundedString(candidate['value'], 8192)
  );
}

const DIAGNOSTIC_CODES = new Set([
  'outside-final-block',
  'whitespace-only-separator',
  'message-too-large',
  'tail-truncated',
  'entries-truncated',
]);

function isValidDiagnosticShape(value: unknown): value is TrailerDiagnostic {
  if (typeof value !== 'object' || value === null) return false;
  const diagnostic = value as Record<string, unknown>;
  return (
    typeof diagnostic['code'] === 'string' &&
    DIAGNOSTIC_CODES.has(diagnostic['code']) &&
    (diagnostic['line'] === undefined || isLineNumber(diagnostic['line']))
  );
}

/** Deep validation of the stored evidence against the renderer's contract. */
function isValidEvidenceShape(value: unknown): value is TrailerEvidence {
  if (typeof value !== 'object' || value === null) return false;
  const evidence = value as Record<string, unknown>;
  return (
    (evidence['strictBlock'] === null || isValidBlockShape(evidence['strictBlock'])) &&
    Array.isArray(evidence['nearbyCandidates']) &&
    evidence['nearbyCandidates'].length <= 256 &&
    evidence['nearbyCandidates'].every(isValidCandidateShape) &&
    Array.isArray(evidence['diagnostics']) &&
    evidence['diagnostics'].length <= 64 &&
    evidence['diagnostics'].every(isValidDiagnosticShape)
  );
}

/**
 * True when a stored value is a well-formed current-schema entry. Stored
 * data is untrusted even at the current schema version — the evidence is
 * validated deeply against the renderer's contract, so a malformed value
 * behaves as a miss instead of crashing the asynchronous chip pass.
 */
export function isValidMemoryEntry(value: unknown): value is MemoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    entry['schema'] === MEMORY_SCHEMA_VERSION &&
    typeof entry['storedAt'] === 'number' &&
    Number.isFinite(entry['storedAt']) &&
    typeof entry['hasRenderedLinks'] === 'boolean' &&
    isValidEvidenceShape(entry['evidence'])
  );
}
