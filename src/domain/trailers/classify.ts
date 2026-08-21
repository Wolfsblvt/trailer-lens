/**
 * Known-key classification: a small reviewed dictionary that improves
 * scanning with friendly labels. Classification is a display hint only —
 * the exact raw key stays authoritative and visible, and unknown keys are
 * first-class evidence, not noise.
 */

/** Broad display category; never a truth level. */
export type TrailerKind =
  | 'contribution'
  | 'attestation'
  | 'review'
  | 'test'
  | 'report'
  | 'reference'
  | 'route-context'
  | 'change-id'
  | 'link'
  | 'unknown';

export interface KnownKeyInfo {
  /** Friendly label, e.g. `Co-authored by`. */
  readonly label: string;
  readonly kind: TrailerKind;
  /** Whether the value is conventionally a `Name <email>` person. */
  readonly personValue: boolean;
}

/**
 * Reviewed common keys (lower-cased). Sources: Git's SubmittingPatches
 * conventions, the Linux patch process, Gerrit's Change-Id, GitHub's
 * co-author convention, and the paired `Co-authored-via` route convention.
 */
const KNOWN_KEYS: ReadonlyMap<string, KnownKeyInfo> = new Map<string, KnownKeyInfo>([
  ['co-authored-by', { label: 'Co-authored by', kind: 'contribution', personValue: true }],
  ['co-developed-by', { label: 'Co-developed by', kind: 'contribution', personValue: true }],
  ['co-authored-via', { label: 'via', kind: 'route-context', personValue: false }],
  ['signed-off-by', { label: 'Signed off by', kind: 'attestation', personValue: true }],
  ['reviewed-by', { label: 'Reviewed by', kind: 'review', personValue: true }],
  ['acked-by', { label: 'Acked by', kind: 'review', personValue: true }],
  ['tested-by', { label: 'Tested by', kind: 'test', personValue: true }],
  ['reported-by', { label: 'Reported by', kind: 'report', personValue: true }],
  ['suggested-by', { label: 'Suggested by', kind: 'contribution', personValue: true }],
  ['helped-by', { label: 'Helped by', kind: 'contribution', personValue: true }],
  ['mentored-by', { label: 'Mentored by', kind: 'contribution', personValue: true }],
  ['fixes', { label: 'Fixes', kind: 'reference', personValue: false }],
  ['closes', { label: 'Closes', kind: 'reference', personValue: false }],
  ['resolves', { label: 'Resolves', kind: 'reference', personValue: false }],
  ['refs', { label: 'Refs', kind: 'reference', personValue: false }],
  ['see-also', { label: 'See also', kind: 'reference', personValue: false }],
  ['change-id', { label: 'Change-Id', kind: 'change-id', personValue: false }],
  ['link', { label: 'Link', kind: 'link', personValue: false }],
  ['message-id', { label: 'Message-ID', kind: 'link', personValue: false }],
]);

/** Look up a key case-insensitively; unknown keys get an honest fallback. */
export function classifyKey(normalizedKey: string): KnownKeyInfo {
  const known = KNOWN_KEYS.get(normalizedKey);
  if (known !== undefined) return known;
  return { label: normalizedKey, kind: 'unknown', personValue: false };
}

/** True when the key is in the reviewed dictionary. */
export function isKnownKey(normalizedKey: string): boolean {
  return KNOWN_KEYS.has(normalizedKey);
}
