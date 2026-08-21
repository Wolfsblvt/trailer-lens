/**
 * Thin `chrome.storage.local` wrapper shared by the content script and the
 * options page. One key, one validated object; nothing else is ever stored.
 */

import { validateSettings, type Settings } from './schema.ts';

const STORAGE_KEY = 'settings';

export function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (stored) => {
      resolve(validateSettings(stored?.[STORAGE_KEY]));
    });
  });
}

export function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => resolve());
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
