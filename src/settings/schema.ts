/**
 * Versioned settings schema with validation and migrations.
 *
 * Stored data is untrusted: it may come from an older or newer extension
 * version, a synced restore, or manual editing. Every read validates from
 * scratch; unknown fields are dropped from the in-memory value (the storage
 * layer preserves newer-version envelopes on write); a failed migration
 * falls back to defaults rather than crashing the content script. Besides
 * settings, the only other stored records are the opt-in device-local
 * memory entries owned by `memory/store.ts` — never whole page content.
 */

export type DetailMode = 'auto' | 'compact' | 'expanded';
export type CompactLabel = 'default' | 'custom' | 'hidden';
export type CompactValues = 'first' | 'combine';
export type CompactProjection = 'automatic' | 'person-name' | 'raw-bounded' | 'delimiter-segment' | 'capture';

import { validateCaptureConfiguration } from './regex.ts';

/** One ordered projection for the bounded list-row glance line. */
export interface CompactRule {
  readonly key: string;
  readonly enabled: boolean;
  readonly label: CompactLabel;
  readonly customLabel: string;
  readonly values: CompactValues;
  /** Maximum displayed values for `combine`; overflow stays behind the disclosure. */
  readonly maxValues: number;
  readonly projection: CompactProjection;
  /** Native-regex source for the advanced `capture` projection only. */
  readonly capturePattern: string;
  /** Supported native-regex flags for the advanced `capture` projection only. */
  readonly captureFlags: string;
}

export interface Settings {
  readonly version: 4;
  readonly enabled: boolean;
  readonly detailMode: DetailMode;
  readonly showDiagnostics: boolean;
  readonly showUnknownKeys: boolean;
  /** Normalized (lower-cased) exact keys to hide from the friendly rows. */
  readonly hiddenKeys: readonly string[];
  /**
   * Device-local trailer memory (1.1): explicit opt-in, off by default.
   * Enabling lets qualified commit pages remember their parsed evidence in
   * chrome.storage.local so reference-only surfaces can show it on an exact
   * full-OID cache hit. Never synced, never transmitted.
   */
  readonly memoryEnabled: boolean;
  readonly compactRules: readonly CompactRule[];
}

export const SETTINGS_VERSION = 4;
export const COMPACT_VALUE_LIMITS = { min: 1, max: 4, default: 3 } as const;

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    enabled: true,
    detailMode: 'auto',
    showDiagnostics: true,
    showUnknownKeys: true,
    hiddenKeys: [],
    memoryEnabled: false,
    compactRules: [{
      key: 'co-authored-by', enabled: true, label: 'default', customLabel: '', values: 'combine',
      maxValues: COMPACT_VALUE_LIMITS.default, projection: 'person-name', capturePattern: '', captureFlags: '',
    }],
  };
}

const DETAIL_MODES: readonly DetailMode[] = ['auto', 'compact', 'expanded'];
const COMPACT_LABELS: readonly CompactLabel[] = ['default', 'custom', 'hidden'];
const COMPACT_VALUES: readonly CompactValues[] = ['first', 'combine'];
const COMPACT_PROJECTIONS: readonly CompactProjection[] = ['automatic', 'person-name', 'raw-bounded', 'delimiter-segment', 'capture'];
const MAX_COMPACT_RULES = 16;

/** A trailer key as the parser normalizes it: alnum/hyphen, lower-cased. */
const KEY_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Normalize a user-entered key for the hidden list; null when invalid. */
export function normalizeHiddenKey(input: string): string | null {
  const key = input.trim().toLowerCase();
  return KEY_PATTERN.test(key) ? key : null;
}

function validateCompactRules(raw: unknown): readonly CompactRule[] {
  if (!Array.isArray(raw)) return defaultSettings().compactRules;
  const rules: CompactRule[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const record = candidate as Record<string, unknown>;
    const key = typeof record['key'] === 'string' ? normalizeHiddenKey(record['key']) : null;
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    const label = COMPACT_LABELS.includes(record['label'] as CompactLabel) ? record['label'] as CompactLabel : 'default';
    const customLabel = typeof record['customLabel'] === 'string' ? record['customLabel'].trim().slice(0, 48) : '';
    const maxValues = typeof record['maxValues'] === 'number' &&
      Number.isInteger(record['maxValues']) &&
      record['maxValues'] >= COMPACT_VALUE_LIMITS.min &&
      record['maxValues'] <= COMPACT_VALUE_LIMITS.max
      ? record['maxValues']
      : COMPACT_VALUE_LIMITS.default;
    const projection = COMPACT_PROJECTIONS.includes(record['projection'] as CompactProjection)
      ? record['projection'] as CompactProjection
      : 'automatic';
    const capturePattern = typeof record['capturePattern'] === 'string' ? record['capturePattern'] : '';
    const captureFlags = typeof record['captureFlags'] === 'string' ? record['captureFlags'] : '';
    const capture = projection === 'capture'
      ? validateCaptureConfiguration(capturePattern, captureFlags)
      : null;
    // An externally edited or stale capture rule must not silently become a
    // different projection. It is omitted until its owner configures it again.
    if (capture !== null && !capture.valid) continue;
    rules.push({
      key,
      enabled: typeof record['enabled'] === 'boolean' ? record['enabled'] : true,
      label: label === 'custom' && customLabel.length === 0 ? 'default' : label,
      customLabel,
      values: COMPACT_VALUES.includes(record['values'] as CompactValues) ? record['values'] as CompactValues : 'first',
      maxValues,
      projection,
      capturePattern: capture?.configuration.pattern ?? '',
      captureFlags: capture?.configuration.flags ?? '',
    });
    if (rules.length >= MAX_COMPACT_RULES) break;
  }
  return rules;
}

/**
 * Validate untrusted stored data into a well-formed `Settings`, migrating
 * older versions step by step. Data from a *newer* schema version keeps the
 * fields this version understands and drops the rest — a downgrade after a
 * Store rollback must not destroy the profile.
 */
export function validateSettings(raw: unknown): Settings {
  const defaults = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return defaults;
  const record = raw as Record<string, unknown>;

  // Field-by-field validation doubles as the v1 -> v4 migration: a v1
  // object simply lacks later fields and receives their safe defaults.
  // Data from newer versions keeps the fields this version understands.
  const hiddenKeys: string[] = [];
  if (Array.isArray(record['hiddenKeys'])) {
    for (const entry of record['hiddenKeys']) {
      if (typeof entry !== 'string') continue;
      const key = normalizeHiddenKey(entry);
      if (key !== null && !hiddenKeys.includes(key)) hiddenKeys.push(key);
      if (hiddenKeys.length >= 128) break;
    }
  }

  return {
    version: SETTINGS_VERSION,
    enabled: typeof record['enabled'] === 'boolean' ? record['enabled'] : defaults.enabled,
    detailMode: DETAIL_MODES.includes(record['detailMode'] as DetailMode)
      ? (record['detailMode'] as DetailMode)
      : defaults.detailMode,
    showDiagnostics:
      typeof record['showDiagnostics'] === 'boolean' ? record['showDiagnostics'] : defaults.showDiagnostics,
    showUnknownKeys:
      typeof record['showUnknownKeys'] === 'boolean' ? record['showUnknownKeys'] : defaults.showUnknownKeys,
    hiddenKeys,
    memoryEnabled: typeof record['memoryEnabled'] === 'boolean' ? record['memoryEnabled'] : defaults.memoryEnabled,
    compactRules: validateCompactRules(record['compactRules']),
  };
}

/** Stable signature for idempotent re-rendering when settings change. */
export function settingsSignature(settings: Settings): string {
  return [
    settings.enabled ? '1' : '0',
    settings.detailMode,
    settings.showDiagnostics ? '1' : '0',
    settings.showUnknownKeys ? '1' : '0',
    [...settings.hiddenKeys].sort().join(','),
    settings.memoryEnabled ? '1' : '0',
    settings.compactRules.map((rule) => [rule.key, rule.enabled ? '1' : '0', rule.label, rule.customLabel, rule.values, rule.maxValues, rule.projection, rule.capturePattern, rule.captureFlags].join(':')).join(','),
  ].join('|');
}
