/**
 * Settings storage custody: reading projects untrusted data into this
 * version's shape; a record written by a newer schema version stays under
 * that version's custody — this version refuses to rewrite it (the
 * Store-rollback scenario) — and a rejected write is reported as failure,
 * never as a save that did not happen.
 */

import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

const backing = new Map<string, unknown>();
const clone = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
const runtimeStub: { lastError: { message: string } | undefined } = { lastError: undefined };
let failingSetsRemaining = 0;

(globalThis as Record<string, unknown>)['chrome'] = {
  runtime: runtimeStub,
  storage: {
    local: {
      get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void {
        const wanted = keys === null ? [...backing.keys()] : Array.isArray(keys) ? keys : [keys];
        const items: Record<string, unknown> = {};
        for (const key of wanted) {
          if (backing.has(key)) items[key] = clone(backing.get(key));
        }
        callback(items);
      },
      set(items: Record<string, unknown>, callback: () => void): void {
        if (failingSetsRemaining > 0) {
          failingSetsRemaining--;
          runtimeStub.lastError = { message: 'storage failure' };
          callback();
          runtimeStub.lastError = undefined;
          return;
        }
        for (const [key, value] of Object.entries(items)) backing.set(key, clone(value));
        callback();
      },
      remove(keys: string[], callback: () => void): void {
        for (const key of keys) backing.delete(key);
        callback();
      },
    },
    onChanged: { addListener(): void {}, removeListener(): void {} },
  },
};

const { loadSettings, loadSettingsEnvelope, saveSettings } = await import('../../src/settings/storage.ts');
const { defaultSettings } = await import('../../src/settings/schema.ts');

beforeEach(() => {
  backing.clear();
  failingSetsRemaining = 0;
});

test('ordinary save writes the current-version object', async () => {
  assert.equal(await saveSettings({ ...defaultSettings(), detailMode: 'compact' }), true);
  assert.deepEqual(backing.get('settings'), { ...defaultSettings(), detailMode: 'compact' });
});

test('a newer settings record is projected for reads and refused for writes', async () => {
  const future = {
    version: 3,
    enabled: true,
    detailMode: 'auto',
    showDiagnostics: true,
    showUnknownKeys: true,
    hiddenKeys: [],
    memoryEnabled: true,
    futureField: { anything: ['the', 'future', 'stored'] },
  };
  backing.set('settings', clone(future));

  const envelope = await loadSettingsEnvelope();
  assert.equal(envelope.ownedByNewerVersion, true);
  assert.equal(envelope.loadFailed, false);
  assert.equal(envelope.settings.version, 2, 'reads project into the shape this version understands');
  assert.equal(envelope.settings.memoryEnabled, true);
  assert.equal((await loadSettings()).memoryEnabled, true, 'the plain read path projects identically');

  // Attempted edit/save and reset must refuse and leave the record intact.
  assert.equal(await saveSettings({ ...envelope.settings, detailMode: 'expanded' }), false);
  assert.equal(await saveSettings(defaultSettings()), false);
  assert.deepEqual(backing.get('settings'), future, 'the newer record survives byte-semantically untouched');
});

test('a rejected write reports failure instead of a save that did not happen', async () => {
  failingSetsRemaining = 1;
  assert.equal(await saveSettings(defaultSettings()), false);
  assert.equal(backing.has('settings'), false, 'nothing was stored');
  assert.equal(await saveSettings(defaultSettings()), true, 'the next save succeeds normally');
});
