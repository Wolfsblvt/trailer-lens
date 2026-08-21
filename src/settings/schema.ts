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

export interface Settings {
  readonly version: 2;
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
}

export const SETTINGS_VERSION = 2;

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    enabled: true,
    detailMode: 'auto',
    showDiagnostics: true,
    showUnknownKeys: true,
    hiddenKeys: [],
    memoryEnabled: false,
  };
}

const DETAIL_MODES: readonly DetailMode[] = ['auto', 'compact', 'expanded'];

/** A trailer key as the parser normalizes it: alnum/hyphen, lower-cased. */
const KEY_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Normalize a user-entered key for the hidden list; null when invalid. */
export function normalizeHiddenKey(input: string): string | null {
  const key = input.trim().toLowerCase();
  return KEY_PATTERN.test(key) ? key : null;
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

  // Field-by-field validation doubles as the v1 -> v2 migration: a v1
  // object simply lacks memoryEnabled and receives the safe default (off).
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
  ].join('|');
}
