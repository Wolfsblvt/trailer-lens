/**
 * Response validation for the Chrome Web Store submit lane.
 *
 * The lane must prove what it uploaded and submitted: item identity and
 * package version are bound on every response, async uploads resolve to a
 * terminal state before submission, and a revision already pending review
 * or staged refuses preflight — a staged revision's publication belongs to
 * the owner's Dashboard decision, and this lane must never become it by
 * rerun (items.publish doubles as that transition).
 *
 * Decision logic lives here, out of workflow YAML, so every required state
 * is exercised by ordinary unit tests against response fixtures. The Store
 * API has never been called by this repository: these are source-contract
 * controls, not live proof — the first real submission validates the lane.
 *
 * CLI: node scripts/store-submit-checks.mjs <check> <jsonFile> <publisherId> <itemId> <version>
 *   check ∈ preflight | upload | async-upload | publish | submission
 * Prints the verdict JSON. Exit codes: 0 proceed/ok, 3 in-progress (poll
 * again), 1 fail closed, 4 preflight refusal (existing submission owns the
 * item; STAGED names the Dashboard boundary).
 */

import { readFileSync } from 'node:fs';

/**
 * The official ItemState enum: ITEM_STATE_UNSPECIFIED, PENDING_REVIEW,
 * STAGED, PUBLISHED, PUBLISHED_TO_TESTERS, REJECTED, CANCELLED. This lane
 * proves exactly one lawful result — a non-published staged submission —
 * so only these two states are ever accepted; every other enum value and
 * any unknown value fails closed.
 */
const LAWFUL_SUBMISSION_STATES = new Set(['PENDING_REVIEW', 'STAGED']);

/** Published-family states: reaching one from this lane bypasses the gate. */
const PUBLISHED_STATES = new Set(['PUBLISHED', 'PUBLISHED_TO_TESTERS']);

function expectedName(publisherId, itemId) {
  return `publishers/${publisherId}/items/${itemId}`;
}

/** Identity check shared by every response: absent fields fail closed. */
function identityProblem(response, publisherId, itemId) {
  if (response.name !== expectedName(publisherId, itemId)) {
    return `response name "${response.name ?? '(absent)'}" is not ${expectedName(publisherId, itemId)}`;
  }
  if (response.itemId !== itemId) {
    return `response itemId "${response.itemId ?? '(absent)'}" is not ${itemId}`;
  }
  return null;
}

/** Before upload/submit: an active submitted revision refuses the run. */
export function assessPreflight(status, publisherId, itemId) {
  const identity = identityProblem(status, publisherId, itemId);
  if (identity !== null) return { verdict: 'fail', reason: identity };
  const state = status.submittedItemRevisionStatus?.state;
  if (state === undefined) return { verdict: 'proceed' };
  if (state === 'STAGED') {
    return {
      verdict: 'refuse',
      reason:
        'a STAGED revision is awaiting the owner publication decision in the Developer Dashboard; this lane must not touch it',
    };
  }
  if (state === 'PENDING_REVIEW') {
    return { verdict: 'refuse', reason: 'a submitted revision is already PENDING_REVIEW; cancel or wait, never overlap' };
  }
  return { verdict: 'proceed' };
}

/**
 * The upload response must bind identity, version, and a terminal state.
 * State is inspected before version: the documented IN_PROGRESS response
 * does not carry crxVersion yet, so requiring it first would make the
 * lawful async path unreachable. A completed upload must carry the exact
 * requested version; an in-progress one must merely not contradict it —
 * its final version is bound later through the submitted revision status.
 */
export function assessUpload(response, publisherId, itemId, version) {
  const identity = identityProblem(response, publisherId, itemId);
  if (identity !== null) return { verdict: 'fail', reason: identity };
  if (response.uploadState === 'SUCCEEDED') {
    if (response.crxVersion !== version) {
      return { verdict: 'fail', reason: `uploaded crxVersion "${response.crxVersion ?? '(absent)'}" is not ${version}` };
    }
    return { verdict: 'succeeded' };
  }
  if (response.uploadState === 'IN_PROGRESS') {
    if (response.crxVersion !== undefined && response.crxVersion !== version) {
      return {
        verdict: 'fail',
        reason: `in-progress upload reports contradictory crxVersion "${response.crxVersion}" (requested ${version})`,
      };
    }
    return { verdict: 'in-progress' };
  }
  return { verdict: 'fail', reason: `uploadState is "${response.uploadState ?? '(absent)'}"` };
}

/** Poll target for an async upload: fetchStatus.lastAsyncUploadState. */
export function assessAsyncUpload(status, publisherId, itemId) {
  const identity = identityProblem(status, publisherId, itemId);
  if (identity !== null) return { verdict: 'fail', reason: identity };
  const state = status.lastAsyncUploadState;
  if (state === 'SUCCEEDED') return { verdict: 'succeeded' };
  if (state === 'IN_PROGRESS') return { verdict: 'in-progress' };
  return { verdict: 'fail', reason: `lastAsyncUploadState is "${state ?? '(absent)'}"` };
}

/** The publish (submission) response: identity, lawful state, warnings.
 *  Only PENDING_REVIEW or STAGED is a lawful result of this lane. */
export function assessPublish(response, publisherId, itemId) {
  const identity = identityProblem(response, publisherId, itemId);
  if (identity !== null) return { verdict: 'fail', reason: identity, warnings: [] };
  const warnings = response.warningInfo?.warnings ?? [];
  const state = response.state;
  if (LAWFUL_SUBMISSION_STATES.has(state)) return { verdict: 'ok', state, warnings };
  if (PUBLISHED_STATES.has(state)) {
    return {
      verdict: 'fail',
      reason: `publish response state is "${state}" — a staged submission must not publish; the owner Dashboard decision was bypassed`,
      warnings,
    };
  }
  return {
    verdict: 'fail',
    reason: `publish response state "${state ?? '(absent)'}" is not a lawful staged-submission result (PENDING_REVIEW or STAGED)`,
    warnings,
  };
}

/** The final fetchStatus must show this exact submission, version-bound.
 *  Only PENDING_REVIEW or STAGED proves the lane's one lawful result. */
export function assessSubmission(status, publisherId, itemId, version) {
  const identity = identityProblem(status, publisherId, itemId);
  if (identity !== null) return { verdict: 'fail', reason: identity };
  const submitted = status.submittedItemRevisionStatus;
  const state = submitted?.state;
  if (state === undefined || state === '') {
    return { verdict: 'fail', reason: 'fetchStatus shows no submitted revision — the submission did not take' };
  }
  if (!LAWFUL_SUBMISSION_STATES.has(state)) {
    return {
      verdict: 'fail',
      reason: `submitted state "${state}" is not a lawful staged-submission result (PENDING_REVIEW or STAGED)`,
    };
  }
  const versions = (submitted.distributionChannels ?? []).map((channel) => channel.crxVersion);
  if (!versions.includes(version)) {
    return {
      verdict: 'fail',
      reason: `no submitted distribution channel carries crxVersion ${version} (saw: ${versions.join(', ') || 'none'})`,
    };
  }
  return { verdict: 'ok', state };
}

const CHECKS = {
  preflight: (json, publisherId, itemId) => assessPreflight(json, publisherId, itemId),
  upload: (json, publisherId, itemId, version) => assessUpload(json, publisherId, itemId, version),
  'async-upload': (json, publisherId, itemId) => assessAsyncUpload(json, publisherId, itemId),
  publish: (json, publisherId, itemId) => assessPublish(json, publisherId, itemId),
  submission: (json, publisherId, itemId, version) => assessSubmission(json, publisherId, itemId, version),
};

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (invokedDirectly) {
  const [check, jsonFile, publisherId, itemId, version] = process.argv.slice(2);
  const run = CHECKS[check];
  if (!run || !jsonFile || !publisherId || !itemId) {
    console.error('usage: node scripts/store-submit-checks.mjs <check> <jsonFile> <publisherId> <itemId> [version]');
    process.exit(2);
  }
  const verdict = run(JSON.parse(readFileSync(jsonFile, 'utf8')), publisherId, itemId, version);
  console.log(JSON.stringify(verdict));
  if (verdict.verdict === 'fail') process.exit(1);
  if (verdict.verdict === 'in-progress') process.exit(3);
  if (verdict.verdict === 'refuse') process.exit(4);
}
