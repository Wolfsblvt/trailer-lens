/**
 * Settings schema: validation of untrusted stored data, normalization of
 * hidden keys, downgrade safety, and signature stability.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultSettings,
  normalizeHiddenKey,
  settingsSignature,
  validateSettings,
} from '../../src/settings/schema.ts';

test('defaults validate to themselves', () => {
  assert.deepEqual(validateSettings(defaultSettings()), defaultSettings());
});

test('garbage input falls back to defaults', () => {
  for (const raw of [undefined, null, 42, 'settings', [], { version: 'x' }]) {
    assert.deepEqual(validateSettings(raw), defaultSettings());
  }
});

test('unknown fields are dropped and known fields validated individually', () => {
  const validated = validateSettings({
    version: 1,
    enabled: false,
    detailMode: 'sideways',
    showDiagnostics: 'yes',
    showUnknownKeys: false,
    hiddenKeys: ['Change-Id', 'CHANGE-ID', 42, 'not a key!', ' link '],
    telemetry: true,
  });
  assert.equal(validated.enabled, false);
  assert.equal(validated.detailMode, 'auto');
  assert.equal(validated.showDiagnostics, true);
  assert.equal(validated.showUnknownKeys, false);
  assert.deepEqual(validated.hiddenKeys, ['change-id', 'link']);
  assert.equal('telemetry' in validated, false);
});

test('data from a newer schema version keeps understood fields', () => {
  const fromFuture = validateSettings({
    version: 7,
    enabled: false,
    detailMode: 'compact',
    futureFeature: { complicated: true },
  });
  assert.equal(fromFuture.version, 1);
  assert.equal(fromFuture.enabled, false);
  assert.equal(fromFuture.detailMode, 'compact');
});

test('hidden-key normalization matches the parser key grammar', () => {
  assert.equal(normalizeHiddenKey(' Reviewed-By '), 'reviewed-by');
  assert.equal(normalizeHiddenKey('CHANGE-ID'), 'change-id');
  assert.equal(normalizeHiddenKey('no spaces'), null);
  assert.equal(normalizeHiddenKey('nope!'), null);
  assert.equal(normalizeHiddenKey(''), null);
  assert.equal(normalizeHiddenKey('x'.repeat(65)), null);
});

test('the hidden-key list is capped against hostile storage', () => {
  const raw = { version: 1, hiddenKeys: Array.from({ length: 500 }, (_, i) => `key-${i}`) };
  assert.equal(validateSettings(raw).hiddenKeys.length, 128);
});

test('signature changes exactly when meaningful settings change', () => {
  const base = defaultSettings();
  assert.equal(settingsSignature(base), settingsSignature(defaultSettings()));
  assert.notEqual(settingsSignature(base), settingsSignature({ ...base, detailMode: 'compact' }));
  assert.notEqual(settingsSignature(base), settingsSignature({ ...base, hiddenKeys: ['link'] }));
  // Hidden-key order is not meaningful.
  assert.equal(
    settingsSignature({ ...base, hiddenKeys: ['a-key', 'b-key'] }),
    settingsSignature({ ...base, hiddenKeys: ['b-key', 'a-key'] }),
  );
});
