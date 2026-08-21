/**
 * Release-asset reconciliation for release-candidate reruns.
 *
 * Assets under a tag are immutable: a rerun may complete a DRAFT release's
 * expected asset set only additively. Per expected asset the states are
 * absent / identical / differing; any differing asset fails the whole run
 * closed (with both digests reported), identical assets are left alone,
 * and only individually absent assets are uploaded — never a replacement.
 *
 * The decision logic lives here, out of workflow YAML, so the required
 * states are exercised by ordinary unit tests; the workflow downloads the
 * existing assets, calls this script, and acts on the JSON verdict.
 *
 * CLI: node scripts/release-assets.mjs <version> <existingDir> <builtDir>
 * Prints the verdict JSON; exits 1 when the verdict is fail.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The complete immutable asset set every candidate release carries. */
export function expectedAssetNames(version) {
  return [
    `trailer-lens-${version}.zip`,
    `trailer-lens-${version}.sha256`,
    `trailer-lens-${version}.inventory.json`,
  ];
}

function digestOf(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Compare the existing draft's assets against the freshly built ones.
 * Returns { action: 'upload' | 'noop' | 'fail', uploads: string[], differing: [{name, existing, built}] }.
 */
export function reconcileAssets(version, existingDir, builtDir) {
  const uploads = [];
  const differing = [];
  for (const name of expectedAssetNames(version)) {
    const builtPath = join(builtDir, name);
    if (!existsSync(builtPath)) {
      throw new Error(`built asset missing: ${name} — the build did not produce the complete set`);
    }
    const existingPath = join(existingDir, name);
    if (!existsSync(existingPath)) {
      uploads.push(name);
      continue;
    }
    const existing = digestOf(existingPath);
    const built = digestOf(builtPath);
    if (existing !== built) differing.push({ name, existing, built });
  }
  if (differing.length > 0) return { action: 'fail', uploads: [], differing };
  if (uploads.length > 0) return { action: 'upload', uploads, differing: [] };
  return { action: 'noop', uploads: [], differing: [] };
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (invokedDirectly) {
  const [version, existingDir, builtDir] = process.argv.slice(2);
  if (!version || !existingDir || !builtDir) {
    console.error('usage: node scripts/release-assets.mjs <version> <existingDir> <builtDir>');
    process.exit(2);
  }
  const verdict = reconcileAssets(version, existingDir, builtDir);
  console.log(JSON.stringify(verdict));
  if (verdict.action === 'fail') {
    for (const item of verdict.differing) {
      console.error(
        `::error::Draft asset ${item.name} differs from the built bytes (existing ${item.existing}, built ${item.built}); assets under a tag are immutable.`,
      );
    }
    process.exit(1);
  }
}
