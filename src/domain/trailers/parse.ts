/**
 * Strict-trailer parsing: extract the final Git-like trailer block from a
 * commit message, plus conservatively bounded nearby trailer-shaped evidence.
 *
 * Two-layer output, by design:
 *
 * 1. `strictBlock` — the best portable approximation of what default
 *    `git interpret-trailers --parse` recognizes, pinned by the oracle corpus.
 * 2. `nearbyCandidates` — trailer-shaped lines in the paragraph immediately
 *    above the strict block. This is the lived failure the product exists
 *    for: one stray (even whitespace-only) blank line silently removes a
 *    line from Git's parse while the page still looks healthy.
 *
 * Nothing is repaired, moved, or merged. Candidates never join the block.
 */

import { LIMITS } from './limits.ts';
import type {
  TrailerBlock,
  TrailerCandidate,
  TrailerDiagnostic,
  TrailerEntry,
  TrailerEvidence,
} from './model.ts';
import {
  canonicalValue,
  hasRecognizedPrefix,
  isBlankLine,
  isCommentLine,
  isContinuationLine,
  parseTrailerLine,
  splitMessageLines,
} from './scan.ts';

/** Parse a complete commit message into trailer evidence. */
export function parseTrailerEvidence(rawMessage: string): TrailerEvidence {
  const diagnostics: TrailerDiagnostic[] = [];

  if (rawMessage.length > LIMITS.maxMessageChars) {
    return { strictBlock: null, nearbyCandidates: [], diagnostics: [{ code: 'message-too-large' }] };
  }

  // Trailers live at the end; scanning only the tail bounds hostile input.
  let text = rawMessage;
  let lineOffset = 0;
  if (text.length > LIMITS.maxTailChars) {
    const cutAt = text.indexOf('\n', text.length - LIMITS.maxTailChars);
    if (cutAt === -1) {
      // One enormous single line cannot contain a final trailer paragraph.
      return { strictBlock: null, nearbyCandidates: [], diagnostics: [{ code: 'message-too-large' }] };
    }
    const removed = text.slice(0, cutAt + 1);
    lineOffset = countLines(removed);
    text = text.slice(cutAt + 1);
    diagnostics.push({ code: 'tail-truncated' });
  }

  const lines = splitMessageLines(text);

  // Walk back over trailing blank lines and comment-only content.
  // Committed-message parsing has no patch divider: `---` is ordinary
  // content here, unlike `git interpret-trailers` input handling
  // (oracle-pinned; the vscode squash-separator specimen depends on it).
  let end = lines.length;
  while (end > 0 && isSkippableTrailing(lines[end - 1] as string)) end--;
  if (end <= 0) {
    return { strictBlock: null, nearbyCandidates: [], diagnostics };
  }

  // The final paragraph is the strict-block candidate.
  let start = end;
  while (start > 0 && !isBlankLine(lines[start - 1] as string)) start--;

  // The block must not be the message's first content: a message that opens
  // with its trailer paragraph has no subject, and Git's committed-message
  // parsing yields nothing there (oracle-pinned, including the
  // leading-blank-line variant).
  let hasContentBefore = false;
  for (let i = 0; i < start; i++) {
    if (!isBlankLine(lines[i] as string)) {
      hasContentBefore = true;
      break;
    }
  }
  if (!hasContentBefore && lineOffset === 0) {
    return { strictBlock: null, nearbyCandidates: [], diagnostics };
  }

  const block = tryParseBlock(lines, start, end, lineOffset, diagnostics);
  if (block === null) {
    return { strictBlock: null, nearbyCandidates: [], diagnostics };
  }

  const nearbyCandidates = collectNearbyCandidates(lines, start, lineOffset, diagnostics);
  return { strictBlock: block, nearbyCandidates, diagnostics };
}

/** Trailing lines Git skips when locating the final paragraph. */
function isSkippableTrailing(line: string): boolean {
  return isBlankLine(line) || isCommentLine(line);
}

function countLines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

interface PendingEntry {
  rawKey: string;
  rawValue: string;
  continuations: string[];
  startLine: number;
  endLine: number;
}

/**
 * Apply Git's block-acceptance rule to the final paragraph
 * (`lines[start..end)`) and build entries when it qualifies.
 *
 * Comment lines are invisible: not entries, not content, no effect on
 * density. Continuations count with their entry. The paragraph qualifies
 * when every visible line belongs to a trailer, or under the mixed rule:
 * at least one case-sensitive recognized prefix and trailers on at least a
 * quarter of the visible lines (oracle-pinned).
 */
function tryParseBlock(
  lines: readonly string[],
  start: number,
  end: number,
  lineOffset: number,
  diagnostics: TrailerDiagnostic[],
): TrailerBlock | null {
  const pending: PendingEntry[] = [];
  let trailerLines = 0;
  let visibleLines = 0;
  let recognized = false;

  for (let i = start; i < end; i++) {
    const line = lines[i] as string;
    if (isCommentLine(line)) continue;
    visibleLines++;
    if (hasRecognizedPrefix(line)) recognized = true;

    const current = pending.length > 0 ? (pending[pending.length - 1] as PendingEntry) : null;
    const parsed = parseTrailerLine(line);
    if (parsed !== null) {
      pending.push({
        rawKey: parsed.rawKey,
        rawValue: parsed.rawValue,
        continuations: [],
        startLine: i,
        endLine: i,
      });
      trailerLines++;
      continue;
    }
    if (
      isContinuationLine(line) &&
      current !== null &&
      current.endLine === i - 1 &&
      current.continuations.length < LIMITS.maxContinuationLines
    ) {
      current.continuations.push(line);
      current.endLine = i;
      trailerLines++;
      continue;
    }
    // A visible non-trailer line; tolerated only under the mixed rule.
  }

  if (pending.length === 0) return null;
  const allTrailers = trailerLines === visibleLines;
  const mixedAccepted = recognized && trailerLines * 4 >= visibleLines;
  if (!allTrailers && !mixedAccepted) return null;

  let entries: TrailerEntry[] = pending.map((entry) => ({
    rawKey: entry.rawKey,
    normalizedKey: entry.rawKey.toLowerCase(),
    rawValue: entry.rawValue,
    unfoldedValue: canonicalValue(entry.rawValue, entry.continuations),
    rawLines: [lines[entry.startLine] as string, ...entry.continuations],
    startLine: entry.startLine + lineOffset,
    endLine: entry.endLine + lineOffset,
  }));
  if (entries.length > LIMITS.maxEntries) {
    entries = entries.slice(0, LIMITS.maxEntries);
    diagnostics.push({ code: 'entries-truncated' });
  }

  return {
    rawText: lines.slice(start, end).join('\n'),
    startLine: start + lineOffset,
    endLine: end - 1 + lineOffset,
    entries,
    recognition: allTrailers ? 'all-trailer-lines' : 'recognized-prefix-mixed',
  };
}

/**
 * Inspect only the paragraph immediately above the strict block for
 * trailer-shaped lines. Bounded on purpose: this catches the blank-line
 * split without turning release-note prose into a wall of warnings.
 */
function collectNearbyCandidates(
  lines: readonly string[],
  blockStart: number,
  lineOffset: number,
  diagnostics: TrailerDiagnostic[],
): TrailerCandidate[] {
  // Walk over the separating blank lines; note whitespace-only ones, which
  // are invisible on GitHub yet still break the block for Git.
  let i = blockStart - 1;
  let sawWhitespaceOnlySeparator = false;
  while (i >= 0 && isBlankLine(lines[i] as string)) {
    if ((lines[i] as string).length > 0) sawWhitespaceOnlySeparator = true;
    i--;
  }
  if (i < 0) return [];

  const paragraphEnd = i + 1;
  let paragraphStart = paragraphEnd;
  while (paragraphStart > 0 && !isBlankLine(lines[paragraphStart - 1] as string)) paragraphStart--;
  if (paragraphEnd - paragraphStart > LIMITS.maxNearbyParagraphLines) return [];
  // The subject paragraph is prose by definition, never candidate material.
  if (paragraphStart === 0) return [];

  const candidates: TrailerCandidate[] = [];
  for (let line = paragraphStart; line < paragraphEnd; line++) {
    const text = lines[line] as string;
    if (isCommentLine(text)) continue;
    const parsed = parseTrailerLine(text);
    if (parsed === null) continue;
    if (candidates.length >= LIMITS.maxNearbyCandidates) break;
    candidates.push({
      rawLine: text,
      line: line + lineOffset,
      rawKey: parsed.rawKey,
      normalizedKey: parsed.rawKey.toLowerCase(),
      value: parsed.rawValue.trim(),
    });
    diagnostics.push({ code: 'outside-final-block', line: line + lineOffset });
  }
  if (candidates.length > 0 && sawWhitespaceOnlySeparator) {
    diagnostics.push({ code: 'whitespace-only-separator' });
  }
  return candidates;
}
