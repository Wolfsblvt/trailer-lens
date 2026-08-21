/**
 * Adapter contract: all selector knowledge lives in adapters, and an adapter
 * yields a unit only when it can prove everything the renderer depends on.
 * Anything less returns nothing — a selector miss must produce no panel,
 * never a best guess beside the nearest SHA.
 */

export interface CommitUnit {
  readonly surface: 'commit-detail';
  /** Full 40-char commit OID, lower-cased, proven against the page. */
  readonly commitId: string;
  /** Complete commit message (subject, blank line, body when present). */
  readonly message: string;
  /** True when the rendered message contained link elements (see extract). */
  readonly hasRenderedLinks: boolean;
  /** Element the owned panel is inserted after, as a following sibling. */
  readonly insertAfter: HTMLElement;
}

export interface CommitSurfaceAdapter {
  readonly id: string;
  /**
   * Discover qualified commit units in the current document. Must prove
   * route, commit identity, full-message presence, and insertion anchor —
   * or return an empty list.
   */
  discover(document: Document, pathname: string): readonly CommitUnit[];
}
