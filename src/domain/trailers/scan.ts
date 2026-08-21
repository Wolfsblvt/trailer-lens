/**
 * Line-level mechanics for trailer scanning: normalization, line
 * classification, and the exact character rules for Git-like trailer lines.
 *
 * The rules here mirror Git's default behavior on *committed* messages —
 * the `%(trailers)` channel — as pinned by the repository's two-channel
 * oracle corpus (see `tests/trailers/`). Where `git interpret-trailers`
 * input handling differs (it honors a `---` patch divider; committed-message
 * parsing does not), the committed channel wins, because that is what a
 * rendered GitHub page contains. The rules deliberately do not model
 * repository-specific configuration such as custom separators,
 * `trailer.<token>.key` aliases, or a non-default comment character, because
 * a browser extension cannot know them from a rendered page. That limitation
 * is part of the documented parser contract.
 */

/** Normalize CRLF and lone CR to LF, then split into lines. */
export function splitMessageLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n');
}

/** Paragraph break: empty or whitespace-only, exactly as Git treats it. */
export function isBlankLine(line: string): boolean {
  return /^[ \t]*$/.test(line);
}

/**
 * Default-comment line (`core.commentChar` `#`). The oracle corpus pins that
 * Git's trailer machinery ignores these even in committed messages: they
 * neither count as content nor break the block.
 */
export function isCommentLine(line: string): boolean {
  return line.startsWith('#');
}

/** Continuation line: leading whitespace attaches it to the previous entry. */
export function isContinuationLine(line: string): boolean {
  return /^[ \t]/.test(line) && !isBlankLine(line);
}

/**
 * Git-generated prefixes that let a mixed final paragraph still qualify as a
 * trailer block. Matching is case-sensitive, as in Git (oracle-pinned).
 */
const RECOGNIZED_PREFIXES = ['Signed-off-by: ', '(cherry picked from commit '] as const;

export function hasRecognizedPrefix(line: string): boolean {
  return RECOGNIZED_PREFIXES.some((prefix) => line.startsWith(prefix));
}

export interface ParsedTrailerLine {
  readonly rawKey: string;
  /** Everything after the `:`, verbatim. */
  readonly rawValue: string;
}

/**
 * Parse one line as a trailer start: a non-empty run of alphanumerics and
 * hyphens, optional spaces or tabs, then `:`. No leading whitespace, no
 * other separator, no internal spaces in the key — Git's default grammar.
 */
export function parseTrailerLine(line: string): ParsedTrailerLine | null {
  const match = /^([A-Za-z0-9-]+)[ \t]*:(.*)$/.exec(line);
  if (!match) return null;
  const rawKey = match[1] as string;
  const rawValue = match[2] as string;
  return { rawKey, rawValue };
}

/** Canonical single-line value: trimmed, matching Git's unfolded projection. */
export function canonicalValue(rawValue: string, continuations: readonly string[]): string {
  const parts = [rawValue.trim()];
  for (const continuation of continuations) {
    parts.push(continuation.trim());
  }
  return parts.filter((part) => part.length > 0).join(' ');
}
