/**
 * `chrome.storage.local` wrapper for settings, shared by the content script
 * and the options page. Settings live under one key, separate from the
 * opt-in memory records (`tlm:…` keys) owned by `memory/store.ts`.
 *
 * Reads validate untrusted data into this version's shape. A record written
 * by a newer schema version (a Store-rollback scenario) stays under that
 * newer version's custody: this version may project it for safe read
 * behavior but never rewrites or replaces it — `saveSettings` refuses, and
 * the options page disables writes while reporting the situation.
 */

import { SETTINGS_VERSION, validateSettings, type Settings } from './schema.ts';

const STORAGE_KEY = 'settings';

export interface SettingsEnvelope {
  /** The projection this version can safely act on. */
  readonly settings: Settings;
  /** True when a newer schema version owns the stored record. */
  readonly ownedByNewerVersion: boolean;
  /** True when Chrome failed to read storage at all (distinct from empty). */
  readonly loadFailed: boolean;
}

function rawLoad(): Promise<{ value: unknown; failed: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (stored) => {
      const failed = chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null;
      resolve({ value: stored?.[STORAGE_KEY], failed });
    });
  });
}

function isNewerVersionRecord(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['version'] === 'number' &&
    ((value as Record<string, unknown>)['version'] as number) > SETTINGS_VERSION
  );
}

export async function loadSettings(): Promise<Settings> {
  return validateSettings((await rawLoad()).value);
}

/** Full load state for surfaces that gate writes (the options page). */
export async function loadSettingsEnvelope(): Promise<SettingsEnvelope> {
  const raw = await rawLoad();
  return {
    settings: validateSettings(raw.value),
    ownedByNewerVersion: isNewerVersionRecord(raw.value),
    loadFailed: raw.failed,
  };
}

/**
 * Persist settings. Resolves false without writing when a newer version
 * owns the stored record or when Chrome rejected the write — the caller
 * must not report a save that did not happen.
 */
export async function saveSettings(settings: Settings): Promise<boolean> {
  const raw = await rawLoad();
  if (raw.failed || isNewerVersionRecord(raw.value)) return false;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
      resolve(chrome.runtime.lastError === undefined || chrome.runtime.lastError === null);
    });
  });
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;
    const change = changes[STORAGE_KEY];
    if (change === undefined) return;
    listener(validateSettings(change.newValue));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
