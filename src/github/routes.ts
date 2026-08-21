/**
 * Route recognition. The content script is injected on all of github.com
 * because GitHub navigates softly between pages; this module is the in-code
 * gate that decides whether the current URL can contain a supported surface.
 */

export interface CommitRoute {
  readonly owner: string;
  readonly repo: string;
  /** SHA exactly as it appears in the URL (7–40 hex chars, any case). */
  readonly sha: string;
}

const COMMIT_PATH = /^\/([^/]+)\/([^/]+)\/commit\/([0-9a-fA-F]{7,40})(?:\/|$)/;

/** Reserved first path segments that can never be a repository owner. */
const NON_REPO_OWNERS = new Set([
  'orgs', 'settings', 'notifications', 'marketplace', 'explore', 'topics',
  'trending', 'collections', 'events', 'sponsors', 'features', 'search',
  'pulls', 'issues', 'codespaces', 'login', 'join', 'about', 'enterprise',
]);

/** Parse a commit-detail route, or null when the path is anything else. */
export function parseCommitRoute(pathname: string): CommitRoute | null {
  const match = COMMIT_PATH.exec(pathname);
  if (!match) return null;
  const owner = match[1] as string;
  const repo = match[2] as string;
  const sha = match[3] as string;
  if (NON_REPO_OWNERS.has(owner.toLowerCase())) return null;
  return { owner, repo, sha: sha.toLowerCase() };
}
