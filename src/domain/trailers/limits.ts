/**
 * Hard bounds for trailer parsing.
 *
 * Commit messages are attacker-controlled input rendered into a page the
 * extension does not own; every scan must terminate quickly no matter what a
 * release bot committed. When a bound is exceeded the parser fails closed and
 * says so through a diagnostic instead of freezing the tab.
 */
export const LIMITS = {
  /** Messages larger than this are not parsed at all. */
  maxMessageChars: 1_048_576,
  /** Only this much of the message tail is scanned; trailers live at the end. */
  maxTailChars: 32_768,
  /** Maximum trailer entries recorded from one block. */
  maxEntries: 64,
  /** Maximum continuation lines attached to one entry. */
  maxContinuationLines: 16,
  /** Maximum lines of the preceding paragraph inspected for nearby candidates. */
  maxNearbyParagraphLines: 12,
  /** Maximum nearby trailer-shaped candidates reported. */
  maxNearbyCandidates: 8,
} as const;
