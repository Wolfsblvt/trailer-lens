/**
 * Static truth controls for the prepared Chrome Web Store workflows: the
 * submission must request a staged publish (an omitted publishType silently
 * defaults to DEFAULT_PUBLISH, which would publish the moment review
 * approves — deleting the human publication gate), and the final
 * publication lane must not use the rollout-percentage endpoint, which only
 * adjusts an already-published revision and is gated to large items.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const workflowsDir = join(process.cwd(), '.github', 'workflows');
const submit = readFileSync(join(workflowsDir, 'store-submit.yml'), 'utf8');
const status = readFileSync(join(workflowsDir, 'store-status.yml'), 'utf8');

/** The workflow without YAML comment lines — what actually executes. */
function executable(yaml: string): string {
  return yaml
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

test('store-submit requests STAGED_PUBLISH explicitly', () => {
  assert.ok(submit.includes('"publishType": "STAGED_PUBLISH"'), 'submission must stage, never default-publish');
  assert.ok(submit.includes('blockOnWarnings'), 'review warnings must be surfaced, not waved through');
});

test('the publication gate is the owner Dashboard, never the rollout endpoint', () => {
  // The status lane verifies state only: no publish call, no upload, and
  // never the rollout endpoint (which cannot publish a staged revision and
  // is gated to >10k-user items).
  assert.ok(!executable(status).includes(':publish'), 'the status lane must not publish');
  assert.ok(!executable(status).includes(':upload'), 'the status lane must not upload');
  assert.ok(!executable(status).includes('setPublishedDeployPercentage'), 'no rollout endpoint anywhere');
  assert.ok(!executable(submit).includes('setPublishedDeployPercentage'), 'submission must not touch rollout either');
  assert.ok(status.includes('Developer Dashboard'), 'the owner Dashboard is named as the publication gate');
});

test('the release candidate never clobbers existing release assets', () => {
  const candidate = readFileSync(join(workflowsDir, 'release-candidate.yml'), 'utf8');
  assert.ok(!executable(candidate).includes('--clobber'), 'assets under a tag are immutable; reruns must fail closed');
  assert.ok(executable(candidate).includes('isDraft'), 'a published release must never be touched');
  assert.ok(
    executable(candidate).includes('release-assets.mjs'),
    'per-asset reconciliation goes through the unit-tested script',
  );
});

test('both store lanes stay manual and environment-gated', () => {
  for (const [name, text] of [
    ['store-submit', submit],
    ['store-status', status],
  ] as const) {
    assert.ok(text.includes('workflow_dispatch'), `${name} is manually dispatched`);
    assert.ok(!/on:\s*\n\s*(push|pull_request|schedule)/.test(text), `${name} has no automatic trigger`);
    assert.ok(text.includes('environment: chrome-web-store'), `${name} runs in the protected environment`);
  }
});
