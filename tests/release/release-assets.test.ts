/**
 * Release-asset reconciliation: a rerun for an existing draft may only
 * complete the expected immutable set additively. Every required state is
 * exercised — fully absent, fully identical, individually missing, and
 * differing (which fails closed with both digests preserved). The
 * non-draft state is a workflow-level gate covered by the static control.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { expectedAssetNames, reconcileAssets } from '../../scripts/release-assets.mjs';

const VERSION = '9.9.9';
const NAMES = expectedAssetNames(VERSION);

function makeDirs(): { existingDir: string; builtDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'tl-assets-'));
  const existingDir = join(root, 'existing');
  const builtDir = join(root, 'built');
  mkdirSync(existingDir);
  mkdirSync(builtDir);
  return { existingDir, builtDir };
}

function writeBuiltSet(builtDir: string): void {
  for (const name of NAMES) writeFileSync(join(builtDir, name), `built bytes of ${name}`);
}

test('an entirely absent set uploads all three assets', () => {
  const { existingDir, builtDir } = makeDirs();
  writeBuiltSet(builtDir);
  assert.deepEqual(reconcileAssets(VERSION, existingDir, builtDir), {
    action: 'upload',
    uploads: NAMES,
    differing: [],
  });
});

test('a fully identical set is a no-op', () => {
  const { existingDir, builtDir } = makeDirs();
  writeBuiltSet(builtDir);
  for (const name of NAMES) writeFileSync(join(existingDir, name), `built bytes of ${name}`);
  assert.deepEqual(reconcileAssets(VERSION, existingDir, builtDir), { action: 'noop', uploads: [], differing: [] });
});

test('an individually missing asset uploads only itself when nothing contradicts', () => {
  const { existingDir, builtDir } = makeDirs();
  writeBuiltSet(builtDir);
  for (const name of NAMES) {
    if (name.endsWith('.inventory.json')) continue;
    writeFileSync(join(existingDir, name), `built bytes of ${name}`);
  }
  assert.deepEqual(reconcileAssets(VERSION, existingDir, builtDir), {
    action: 'upload',
    uploads: [`trailer-lens-${VERSION}.inventory.json`],
    differing: [],
  });
});

test('any differing asset fails closed with both digests, even beside a missing one', () => {
  const { existingDir, builtDir } = makeDirs();
  writeBuiltSet(builtDir);
  // Identical ZIP, differing checksum file, missing inventory: the stale
  // checksum must fail the run — nothing uploads, notes never refresh.
  writeFileSync(join(existingDir, NAMES[0] as string), `built bytes of ${NAMES[0]}`);
  writeFileSync(join(existingDir, NAMES[1] as string), 'stale checksum bytes');
  const verdict = reconcileAssets(VERSION, existingDir, builtDir);
  assert.equal(verdict.action, 'fail');
  assert.deepEqual(verdict.uploads, []);
  assert.equal(verdict.differing.length, 1);
  const differing = verdict.differing[0] as { name: string; existing: string; built: string };
  assert.equal(differing.name, NAMES[1]);
  assert.match(differing.existing, /^[0-9a-f]{64}$/);
  assert.match(differing.built, /^[0-9a-f]{64}$/);
  assert.notEqual(differing.existing, differing.built);
});

test('an incomplete build refuses to reconcile at all', () => {
  const { existingDir, builtDir } = makeDirs();
  writeFileSync(join(builtDir, NAMES[0] as string), 'only the zip');
  assert.throws(() => reconcileAssets(VERSION, existingDir, builtDir), /built asset missing/);
});
