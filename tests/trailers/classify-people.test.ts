/**
 * Known-key classification and conservative person-value parsing.
 * Classification is a display hint; person parsing must reject anything
 * that is not exactly `Name <email>` so the raw value stands unchanged.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyKey, isKnownKey } from '../../src/domain/trailers/classify.ts';
import { parsePersonValue } from '../../src/domain/trailers/people.ts';

test('known keys resolve case-insensitively with friendly labels', () => {
  assert.equal(classifyKey('co-authored-by').label, 'Co-authored by');
  assert.equal(classifyKey('co-authored-by').kind, 'contribution');
  assert.equal(classifyKey('signed-off-by').kind, 'attestation');
  assert.equal(classifyKey('co-authored-via').kind, 'route-context');
  assert.equal(classifyKey('change-id').label, 'Change-Id');
  assert.ok(isKnownKey('reviewed-by'));
});

test('unknown keys fall back to the exact key with unknown kind', () => {
  const info = classifyKey('build-context');
  assert.equal(info.label, 'build-context');
  assert.equal(info.kind, 'unknown');
  assert.equal(info.personValue, false);
  assert.equal(isKnownKey('build-context'), false);
});

test('signed-off-by is an attestation, never a signature', () => {
  // The kind vocabulary has no value that could be confused with GitHub's
  // cryptographic "Verified" state; this pins that separation.
  assert.equal(classifyKey('signed-off-by').kind, 'attestation');
});

test('person values parse only the exact Name <email> grammar', () => {
  assert.deepEqual(parsePersonValue('Juno <juno@agents.example.com>'), {
    displayName: 'Juno',
    email: 'juno@agents.example.com',
  });
  assert.deepEqual(parsePersonValue('  Ada Lovelace   <ada@computing.example.org>  '), {
    displayName: 'Ada Lovelace',
    email: 'ada@computing.example.org',
  });
  assert.deepEqual(parsePersonValue('Copilot <223556219+Copilot@users.noreply.github.com>'), {
    displayName: 'Copilot',
    email: '223556219+Copilot@users.noreply.github.com',
  });
});

test('non-matching values return null so the raw value stands', () => {
  assert.equal(parsePersonValue('Juno'), null);
  assert.equal(parsePersonValue('juno@example.com'), null);
  assert.equal(parsePersonValue('<juno@example.com>'), null);
  assert.equal(parsePersonValue('Juno <juno@example.com'), null);
  assert.equal(parsePersonValue('Juno <juno@localhost>'), null);
  assert.equal(parsePersonValue('Juno <two@at@example.com>'), null);
  assert.equal(parsePersonValue('Juno <juno@example.com> extra'), null);
  assert.equal(parsePersonValue('Ju<no> <juno@example.com>'), null);
  assert.equal(parsePersonValue(''), null);
});
