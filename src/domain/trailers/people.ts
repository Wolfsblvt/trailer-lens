/**
 * Conservative person-value parsing for `Name <email>` shaped values.
 *
 * The grammar is deliberately strict: when a value does not match exactly,
 * the caller renders the original value unchanged. No lookup, no inference,
 * no repair — a parsed person is a display convenience, never a claim that
 * the address belongs to anyone.
 */

export interface PersonValue {
  readonly displayName: string;
  readonly email: string;
}

/**
 * Parse `Display Name <local@domain>` exactly. The email must be a single
 * token containing one `@` with a non-empty local part and a dot-bearing
 * domain; anything else returns null and the raw value stands.
 */
export function parsePersonValue(value: string): PersonValue | null {
  const match = /^(\S(?:[^<>]*\S)?)\s+<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/.exec(value.trim());
  if (!match) return null;
  const displayName = match[1] as string;
  const email = match[2] as string;
  return { displayName, email };
}
