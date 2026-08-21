/**
 * Reference-link discovery for device-local trailer memory (1.1).
 *
 * Admitted surfaces (qualified 2026-08-21 against live pages; see
 * docs/DECISIONS.md): blame views, release pages, and PR/issue timelines.
 * A reference qualifies only when the link's own href carries the full
 * 40-char OID — repository identity comes from that href, so
 * cross-repository references key to their own repository by construction.
 *
 * Deliberately excluded, each failing a named gate:
 * - links inside comment/markdown bodies — arbitrary user prose is not a
 *   stable attributable evidence anchor, and decorating people's comments
 *   is not this product's place;
 * - short-hash-only links (autolinked references without a full OID href);
 * - hovercard/popover content — transient, unowned positioning.
 */

import { identityFromCommitHref, memoryKey, type CommitIdentity } from '../../memory/keys.ts';

/** Routes on which remembered evidence may decorate commit references. */
const REFERENCE_ROUTES = [
  /^\/[^/]+\/[^/]+\/blame\//,
  /^\/[^/]+\/[^/]+\/releases(?:\/|$)/,
  /^\/[^/]+\/[^/]+\/pull\/\d+(?:$|\/?$)/,
  /^\/[^/]+\/[^/]+\/issues\/\d+(?:$|\/?$)/,
];

export function isReferenceRoute(pathname: string): boolean {
  return REFERENCE_ROUTES.some((route) => route.test(pathname));
}

export interface ReferenceUnit {
  readonly identity: CommitIdentity;
  readonly storageKey: string;
  /** The commit link the chip attaches after. */
  readonly anchor: HTMLAnchorElement;
}

/** Containers whose links are user content, never evidence anchors. */
const EXCLUDED_ANCESTOR = [
  '.comment-body',
  '[data-testid="markdown-body"]',
  '.markdown-body',
  '[data-trailer-lens]',
].join(', ');

/** Discover qualified commit references in the current document. */
export function discoverReferenceUnits(doc: Document, host: string): readonly ReferenceUnit[] {
  const units: ReferenceUnit[] = [];
  const seenAnchors = new Set<Element>();
  for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href*="/commit"]')) {
    if (seenAnchors.has(anchor)) continue;
    seenAnchors.add(anchor);
    if (anchor.closest(EXCLUDED_ANCESTOR) !== null) continue;
    const href = anchor.getAttribute('href');
    if (href === null) continue;
    const identity = identityFromCommitHref(href, host);
    if (identity === null) continue;
    const storageKey = memoryKey(identity);
    if (storageKey === null) continue;
    units.push({ identity, storageKey, anchor });
  }
  return units;
}
