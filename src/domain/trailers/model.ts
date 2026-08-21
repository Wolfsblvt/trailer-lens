/**
 * Immutable domain model for commit-trailer evidence.
 *
 * The model preserves exactly what the commit message contains: raw lines,
 * source order, repeated keys, original casing, separator spacing, and
 * continuations. Interpretation (friendly labels, person parsing, pairing)
 * lives in separate modules and never mutates these values.
 *
 * Line numbers are 0-based indices into the newline-normalized message.
 */

/** One parsed trailer entry from the strict final block. */
export interface TrailerEntry {
  /** Key exactly as written, casing preserved (e.g. `REVIEWED-BY`). */
  readonly rawKey: string;
  /** Lower-cased key for case-insensitive lookup and hiding. */
  readonly normalizedKey: string;
  /**
   * Value exactly as written after the `:` separator, including any leading
   * whitespace, with continuation lines preserved via `rawLines`.
   */
  readonly rawValue: string;
  /**
   * Canonical value: leading/trailing whitespace trimmed and continuation
   * lines unfolded with single spaces — the projection Git's own
   * `%(trailers:only,unfold)` and `interpret-trailers --parse` emit.
   */
  readonly unfoldedValue: string;
  /** The exact source lines of this entry (first line plus continuations). */
  readonly rawLines: readonly string[];
  /** First line of the entry in the message. */
  readonly startLine: number;
  /** Last line of the entry in the message (inclusive). */
  readonly endLine: number;
}

/** How the final block qualified as a trailer block under Git-like rules. */
export type BlockRecognition = 'all-trailer-lines' | 'recognized-prefix-mixed';

/** The strict final trailer block, modeled on default Git behavior. */
export interface TrailerBlock {
  /**
   * The exact final paragraph, newline-joined — including any non-trailer
   * lines Git tolerates inside a recognized mixed block. This is what the
   * copy action copies, matching Git's own `%(trailers)` block projection.
   */
  readonly rawText: string;
  /** First line of the block paragraph in the message. */
  readonly startLine: number;
  /** Last line of the block paragraph in the message (inclusive). */
  readonly endLine: number;
  /** Parsed trailer entries in source order; repeats preserved. */
  readonly entries: readonly TrailerEntry[];
  readonly recognition: BlockRecognition;
}

/**
 * A trailer-shaped line found immediately above the strict block — evidence
 * the author probably intended as a trailer that Git will silently ignore
 * (for example after a stray blank line). Never merged into the block.
 */
export interface TrailerCandidate {
  /** The exact source line. */
  readonly rawLine: string;
  /** Line number in the message. */
  readonly line: number;
  /** Key as written, when the line parses as key/value. */
  readonly rawKey: string;
  readonly normalizedKey: string;
  /** Value as written after the separator, trimmed. */
  readonly value: string;
}

export type DiagnosticCode =
  /** A trailer-shaped line sits outside Git's final trailer block. */
  | 'outside-final-block'
  /** The line separating candidate from block contains only whitespace —
   *  invisible on GitHub, but Git still treats it as a paragraph break. */
  | 'whitespace-only-separator'
  /** Message exceeded `maxMessageChars`; nothing was parsed. */
  | 'message-too-large'
  /** Only the message tail was scanned (`maxTailChars`). */
  | 'tail-truncated'
  /** Entry count exceeded `maxEntries`; excess entries were not recorded. */
  | 'entries-truncated';

export interface TrailerDiagnostic {
  readonly code: DiagnosticCode;
  /** Line the diagnostic refers to, where one applies. */
  readonly line?: number;
}

/** Complete parse result for one commit message. */
export interface TrailerEvidence {
  /** Strict final trailer block, or null when the message has none. */
  readonly strictBlock: TrailerBlock | null;
  /** Bounded nearby trailer-shaped evidence outside the strict block. */
  readonly nearbyCandidates: readonly TrailerCandidate[];
  readonly diagnostics: readonly TrailerDiagnostic[];
}

/** True when the evidence contains anything worth rendering. */
export function hasEvidence(evidence: TrailerEvidence): boolean {
  return evidence.strictBlock !== null || evidence.nearbyCandidates.length > 0;
}
