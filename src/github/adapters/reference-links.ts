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
  /** The commit link whose href carries the identity. */
  readonly anchor: HTMLAnchorElement;
  /** The element the chip renders after — outside clipping ancestors. */
  readonly attachAfter: HTMLElement;
}

/**
 * GitHub truncates long commit messages with `overflow: hidden` +
 * `text-overflow: ellipsis` (blame's commitMessage span, timeline titles).
 * A chip appended inside such a container is laid out past the clip edge and
 * never painted, so the attachment point hops outside clipping ancestors.
 * The walk is bounded: hopping only ever moves the chip next to a wrapper of
 * the same link, and a surface with no clipping keeps the link itself.
 */
function attachmentPoint(anchor: HTMLAnchorElement): HTMLElement {
  const view = anchor.ownerDocument.defaultView;
  if (view === null) return anchor;
  let point: HTMLElement = anchor;
  for (let hops = 0; hops < 3; hops++) {
    const parent = point.parentElement;
    if (parent === null) break;
    const style = view.getComputedStyle(parent);
    const clips =
      style.textOverflow === 'ellipsis' || style.overflowX === 'hidden' || style.overflowX === 'clip';
    if (!clips) break;
    point = parent;
  }
  return point;
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
    units.push({ identity, storageKey, anchor, attachAfter: attachmentPoint(anchor) });
  }
  return units;
}
