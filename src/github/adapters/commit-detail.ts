/**
 * Commit-detail adapter for `github.com/<owner>/<repo>/commit/<sha>`.
 *
 * Selector rationale (qualified 2026-08-21 against live rendered pages,
 * logged-out; recorded in docs/DECISIONS.md and pinned by fixtures):
 *
 * - The page is a React `commits` app. Its server-embedded JSON payload goes
 *   stale on soft navigation while the rendered DOM updates, so the rendered
 *   DOM is the only extraction source used here.
 * - The message lives in one container `div` whose CSS-module class starts
 *   with `CommitHeader-module__commitMessageContainer` (hashed suffix churns
 *   per GitHub deploy; the prefix is the stable part). Its first child span
 *   is the subject; an optional `.extended-commit-description-container`
 *   span is the full body, `white-space: pre-wrap`, newlines preserved.
 *   Title-only commits simply lack the body span.
 * - Commit identity is proven twice from rendered content that updates on
 *   soft navigation: the header's `Commit <abbrev>` label must prefix the
 *   route SHA, and a `Browse files` tree link carrying the full 40-char OID
 *   must match the route SHA.
 */

import { parseCommitRoute } from '../routes.ts';
import { extractRenderedText } from '../extract.ts';
import type { CommitSurfaceAdapter, CommitUnit } from './contract.ts';

const CONTAINER_SELECTOR = '[class*="CommitHeader-module__commitMessageContainer"]';
const BODY_SELECTOR = '.extended-commit-description-container';

export const commitDetailAdapter: CommitSurfaceAdapter = {
  id: 'commit-detail@1',

  discover(document: Document, pathname: string): readonly CommitUnit[] {
    const route = parseCommitRoute(pathname);
    if (route === null) return [];

    // Exactly one message container, or the page shape is not the one we
    // qualified and we render nothing.
    const containers = document.querySelectorAll(CONTAINER_SELECTOR);
    if (containers.length !== 1) return [];
    const container = containers[0] as HTMLElement;

    // Identity proof 1: the full-OID tree link ("Browse files").
    const fullOid = findFullOid(document, route.sha);
    if (fullOid === null) return [];

    // Identity proof 2: the rendered `Commit <abbrev>` heading.
    if (!headingMatches(document, fullOid)) return [];

    // Subject is the first element child; body span is optional.
    const subjectEl = container.firstElementChild;
    if (!(subjectEl instanceof HTMLElement)) return [];
    if (subjectEl.matches(BODY_SELECTOR)) return [];
    const bodyEl = container.querySelector(BODY_SELECTOR);
    if (bodyEl !== null && bodyEl.parentElement !== container) return [];

    const subject = extractRenderedText(subjectEl);
    const body = bodyEl instanceof HTMLElement ? extractRenderedText(bodyEl) : null;
    if (subject.text.trim().length === 0) return [];

    const message = body === null ? subject.text : `${subject.text}\n\n${body.text}`;

    return [
      {
        surface: 'commit-detail',
        commitId: fullOid,
        message,
        hasRenderedLinks: subject.hasRenderedLinks || (body?.hasRenderedLinks ?? false),
        insertAfter: container,
      },
    ];
  },
};

/**
 * Find the full 40-char OID via a same-repository `/tree/<oid>` link whose
 * OID starts with the route SHA. Returns the lower-cased OID or null.
 */
function findFullOid(document: Document, routeSha: string): string | null {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/tree/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href === null) continue;
    const match = /\/tree\/([0-9a-f]{40})(?:[/?#]|$)/.exec(href);
    if (!match) continue;
    const oid = (match[1] as string).toLowerCase();
    if (oid.startsWith(routeSha)) return oid;
  }
  return null;
}

/** The `Commit <abbrev>` heading must agree with the proven OID. */
function headingMatches(document: Document, fullOid: string): boolean {
  for (const heading of document.querySelectorAll('h1, h2')) {
    const match = /^Commit\s+([0-9a-f]{7,40})$/.exec(heading.textContent?.trim() ?? '');
    if (match && fullOid.startsWith((match[1] as string).toLowerCase())) return true;
  }
  return false;
}
