/**
 * Memory keys: host + exact repository identity + full commit OID.
 *
 * A full Git OID content-addresses immutable commit bytes, so the OID is
 * the identity that makes remembered evidence safe to render elsewhere.
 * A short display hash is never a key — deriving one would be guessing,
 * and guessing is exactly what this feature must never do.
 */

export const MEMORY_KEY_PREFIX = 'tlm:';

export interface CommitIdentity {
  /** Lower-cased host, e.g. `github.com`. */
  readonly host: string;
  readonly owner: string;
  readonly repo: string;
  /** Full 40-char lower-case commit OID. */
  readonly oid: string;
}

const FULL_OID = /^[0-9a-f]{40}$/;

/** Build the storage key for one commit, or null when identity is partial. */
export function memoryKey(identity: CommitIdentity): string | null {
  const host = identity.host.toLowerCase();
  const oid = identity.oid.toLowerCase();
  if (!FULL_OID.test(oid)) return null;
  if (!host || !identity.owner || !identity.repo) return null;
  if (identity.owner.includes('/') || identity.repo.includes('/')) return null;
  return `${MEMORY_KEY_PREFIX}${host}/${identity.owner}/${identity.repo}@${oid}`;
}

/** Parse a storage key back into its identity, or null for foreign keys. */
export function parseMemoryKey(key: string): CommitIdentity | null {
  if (!key.startsWith(MEMORY_KEY_PREFIX)) return null;
  const match = /^([^/]+)\/([^/]+)\/([^@/]+)@([0-9a-f]{40})$/.exec(key.slice(MEMORY_KEY_PREFIX.length));
  if (!match) return null;
  return {
    host: match[1] as string,
    owner: match[2] as string,
    repo: match[3] as string,
    oid: match[4] as string,
  };
}

/**
 * Extract a commit identity from a link URL when — and only when — the
 * href itself carries the full OID. Repository identity comes from the
 * href path, so cross-repository references key to their own repository.
 */
export function identityFromCommitHref(href: string, pageHost: string): CommitIdentity | null {
  let url: URL;
  try {
    url = new URL(href, `https://${pageHost}`);
  } catch {
    return null;
  }
  // Terminators deliberately exclude `.`: `<oid>.patch` / `<oid>.diff` are
  // derived-file routes, not the commit page the chip should describe.
  const match = /^\/([^/]+)\/([^/]+)\/(?:commit|commits|pull\/\d+\/commits)\/([0-9a-f]{40})(?:[/?#]|$)/.exec(
    url.pathname,
  );
  if (!match) return null;
  return {
    host: url.hostname.toLowerCase(),
    owner: match[1] as string,
    repo: match[2] as string,
    oid: (match[3] as string).toLowerCase(),
  };
}
