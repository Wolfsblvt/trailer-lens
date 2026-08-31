/**
 * Post-hydration commit-list adapters. Each selector is independently routed:
 * a changed GitHub surface makes only that surface fail closed. The title is
 * copied as source data before we add an owned sibling; it is never changed.
 */

import { extractRenderedText } from '../extract.ts';
import { isPullCommitsRoute, isPullOverviewRoute, isRepositoryHistoryRoute } from '../routes.ts';
import type { CommitSurfaceAdapter, CommitUnit } from './contract.ts';

const FULL_OID = /\/(?:commit|commits)\/([0-9a-f]{40})(?:[/?#]|$)/i;

export const pullOverviewAdapter: CommitSurfaceAdapter = {
  id: 'pr-overview@1',
  discover(document, pathname) {
    if (!isPullOverviewRoute(pathname)) return [];
    return discoverTitleUnits(document, 'pr-overview', 'a.Link--secondary.markdown-title[title]');
  },
};

export const pullCommitsAdapter: CommitSurfaceAdapter = {
  id: 'pr-commits@1',
  discover(document, pathname) {
    if (!isPullCommitsRoute(pathname)) return [];
    return discoverTitleUnits(document, 'pr-commits', 'a.color-fg-default[title]');
  },
};

export const repositoryHistoryAdapter: CommitSurfaceAdapter = {
  id: 'repository-history@1',
  discover(document, pathname) {
    if (!isRepositoryHistoryRoute(pathname)) return [];
    return discoverTitleUnits(document, 'repository-history', 'a.color-fg-default[title]');
  },
};

function discoverTitleUnits(
  document: Document,
  surface: Exclude<CommitUnit['surface'], 'commit-detail'>,
  selector: string,
): readonly CommitUnit[] {
  const units: CommitUnit[] = [];
  for (const [index, source] of [...document.querySelectorAll<HTMLAnchorElement>(selector)].entries()) {
    const title = source.getAttribute('title');
    const row = source.closest<HTMLElement>('li');
    if (title === null || title.length === 0 || row === null || row.parentElement === null) continue;
    const links = [...row.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .map((link) => ({ link, match: FULL_OID.exec(link.getAttribute('href') ?? '') }))
      .filter((candidate): candidate is { link: HTMLAnchorElement; match: RegExpExecArray } => candidate.match !== null);
    if (links.length !== 1) continue;
    const oid = links[0]!.match[1];
    if (oid === undefined) continue;
    const rendered = extractRenderedText(source);
    units.push({
      surface,
      commitId: oid.toLowerCase(),
      unitId: `${surface}:${index}:${oid.toLowerCase()}`,
      message: title,
      hasRenderedLinks: rendered.hasRenderedLinks,
      insertAfter: row,
    });
  }
  return units;
}
