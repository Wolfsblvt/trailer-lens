/**
 * Conservative pairing of `Co-authored-via` route context with
 * `Co-authored-by` authorship, for the friendly summary only.
 *
 * `Co-authored-via` is a custom convention whose value's first
 * pipe-delimited segment repeats the co-author's name as a join key:
 *
 *   Co-authored-via: Juno | Claude Code | Opus 5 | Max
 *   Co-authored-by: Juno <juno@example.com>
 *
 * A pair is formed only when the relation is unambiguous (rules below).
 * Everything else renders independently — two convenient lines sitting near
 * each other are proximity, not a relation. The raw view always keeps the
 * original source order regardless of pairing.
 */

import type { TrailerEntry, TrailerEvidence } from './model.ts';
import { parsePersonValue, type PersonValue } from './people.ts';

export interface RouteContext {
  /** The join-key segment, as written. */
  readonly identity: string;
  /** Remaining pipe segments (client, model, effort, …), trimmed, in order. */
  readonly segments: readonly string[];
}

export interface CoAuthorPair {
  readonly byEntry: TrailerEntry;
  readonly viaEntry: TrailerEntry;
  readonly person: PersonValue;
  readonly route: RouteContext;
}

export interface PairingResult {
  readonly pairs: readonly CoAuthorPair[];
  /** `Co-authored-by` entries that formed no pair. */
  readonly unpairedBy: readonly TrailerEntry[];
  /** `Co-authored-via` entries that formed no pair. */
  readonly unpairedVia: readonly TrailerEntry[];
}

/** Parse a `Co-authored-via` value into identity plus remaining segments. */
export function parseRouteContext(value: string): RouteContext | null {
  const segments = value.split('|').map((segment) => segment.trim());
  const identity = segments[0] ?? '';
  if (identity.length === 0) return null;
  return { identity, segments: segments.slice(1).filter((segment) => segment.length > 0) };
}

/**
 * Join-key comparison: trimmed, Unicode-case-insensitive exact match.
 * Deliberately no normalization beyond casing — `J. Doe` never matches
 * `Doe, J.`, because guessing with better typography is still guessing.
 */
function identitiesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Pair entries under the unique-join rule. All conditions must hold:
 *
 * 1. both entries are inside the same strict final trailer block;
 * 2. the route value has a non-empty first pipe segment;
 * 3. the co-author value parses exactly as `Name <email>`;
 * 4. route identity and co-author name match case-insensitively;
 * 5. each identity is unique among both the routes and the co-authors —
 *    duplicates or many-to-one relations pair nothing they touch; and
 * 6. the evidence carries no malformed-block candidates for these keys
 *    (a `Co-authored-via` sitting outside the block never pairs).
 */
export function pairCoAuthorVia(evidence: TrailerEvidence): PairingResult {
  const block = evidence.strictBlock;
  if (block === null) return { pairs: [], unpairedBy: [], unpairedVia: [] };

  const byEntries = block.entries.filter((entry) => entry.normalizedKey === 'co-authored-by');
  const viaEntries = block.entries.filter((entry) => entry.normalizedKey === 'co-authored-via');
  if (byEntries.length === 0 && viaEntries.length === 0) {
    return { pairs: [], unpairedBy: [], unpairedVia: [] };
  }

  // Condition 6: candidates outside the block poison pairing for their key.
  const hasOutsideCoAuthorEvidence = evidence.nearbyCandidates.some(
    (candidate) =>
      candidate.normalizedKey === 'co-authored-by' || candidate.normalizedKey === 'co-authored-via',
  );
  if (hasOutsideCoAuthorEvidence) {
    return { pairs: [], unpairedBy: byEntries, unpairedVia: viaEntries };
  }

  interface ByRecord { entry: TrailerEntry; person: PersonValue }
  interface ViaRecord { entry: TrailerEntry; route: RouteContext }

  const byRecords: ByRecord[] = [];
  for (const entry of byEntries) {
    const person = parsePersonValue(entry.unfoldedValue);
    if (person !== null) byRecords.push({ entry, person });
  }
  const viaRecords: ViaRecord[] = [];
  for (const entry of viaEntries) {
    const route = parseRouteContext(entry.unfoldedValue);
    if (route !== null) viaRecords.push({ entry, route });
  }

  const countByIdentity = (identities: readonly string[], identity: string): number =>
    identities.filter((candidate) => identitiesMatch(candidate, identity)).length;
  const byNames = byRecords.map((record) => record.person.displayName);
  const viaNames = viaRecords.map((record) => record.route.identity);

  const pairs: CoAuthorPair[] = [];
  const pairedBy = new Set<TrailerEntry>();
  const pairedVia = new Set<TrailerEntry>();

  for (const via of viaRecords) {
    // Condition 5: the identity must be unique on both sides.
    if (countByIdentity(viaNames, via.route.identity) !== 1) continue;
    const matches = byRecords.filter((by) => identitiesMatch(by.person.displayName, via.route.identity));
    if (matches.length !== 1) continue;
    const by = matches[0] as ByRecord;
    if (countByIdentity(byNames, by.person.displayName) !== 1) continue;
    pairs.push({ byEntry: by.entry, viaEntry: via.entry, person: by.person, route: via.route });
    pairedBy.add(by.entry);
    pairedVia.add(via.entry);
  }

  return {
    pairs,
    unpairedBy: byEntries.filter((entry) => !pairedBy.has(entry)),
    unpairedVia: viaEntries.filter((entry) => !pairedVia.has(entry)),
  };
}
