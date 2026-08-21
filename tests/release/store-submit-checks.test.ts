/**
 * Store submit-lane response validation, per state: the lane must prove
 * what it uploaded and submitted. Item identity and package version bind on
 * every response, async uploads resolve before submission, an existing
 * pending/staged revision refuses preflight (STAGED names the owner
 * Dashboard boundary), and a published state is never accepted as proof of
 * a staged submission. These are source-contract controls against the
 * documented response shapes — the Store API has never been called here.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessAsyncUpload,
  assessPreflight,
  assessPublish,
  assessSubmission,
  assessUpload,
} from '../../scripts/store-submit-checks.mjs';

const PUBLISHER = 'pub-1';
const ITEM = 'item-abc';
const NAME = `publishers/${PUBLISHER}/items/${ITEM}`;
const VERSION = '1.1.0';

test('preflight proceeds on a quiet item and refuses active submissions', () => {
  assert.deepEqual(assessPreflight({ name: NAME, itemId: ITEM }, PUBLISHER, ITEM), { verdict: 'proceed' });

  const pending = assessPreflight(
    { name: NAME, itemId: ITEM, submittedItemRevisionStatus: { state: 'PENDING_REVIEW' } },
    PUBLISHER,
    ITEM,
  );
  assert.equal(pending.verdict, 'refuse');

  const staged = assessPreflight(
    { name: NAME, itemId: ITEM, submittedItemRevisionStatus: { state: 'STAGED' } },
    PUBLISHER,
    ITEM,
  );
  assert.equal(staged.verdict, 'refuse');
  assert.match(staged.reason ?? '', /Dashboard/, 'the staged refusal names the owner publication boundary');

  const wrongItem = assessPreflight({ name: NAME, itemId: 'other-item' }, PUBLISHER, ITEM);
  assert.equal(wrongItem.verdict, 'fail');
});

test('upload binds identity and version and classifies terminal states', () => {
  const ok = { name: NAME, itemId: ITEM, crxVersion: VERSION, uploadState: 'SUCCEEDED' };
  assert.equal(assessUpload(ok, PUBLISHER, ITEM, VERSION).verdict, 'succeeded');
  assert.equal(assessUpload({ ...ok, uploadState: 'IN_PROGRESS' }, PUBLISHER, ITEM, VERSION).verdict, 'in-progress');
  assert.equal(assessUpload({ ...ok, uploadState: 'FAILED' }, PUBLISHER, ITEM, VERSION).verdict, 'fail');
  assert.equal(assessUpload({ ...ok, uploadState: undefined }, PUBLISHER, ITEM, VERSION).verdict, 'fail');
  assert.equal(assessUpload({ ...ok, crxVersion: '9.9.9' }, PUBLISHER, ITEM, VERSION).verdict, 'fail', 'wrong version');
  assert.equal(assessUpload({ ...ok, itemId: 'other' }, PUBLISHER, ITEM, VERSION).verdict, 'fail', 'wrong item');
  assert.equal(
    assessUpload({ ...ok, name: 'publishers/pub-1/items/other' }, PUBLISHER, ITEM, VERSION).verdict,
    'fail',
    'wrong resource name',
  );
});

test('async upload polling classifies success, progress, and failure', () => {
  const base = { name: NAME, itemId: ITEM };
  assert.equal(assessAsyncUpload({ ...base, lastAsyncUploadState: 'SUCCEEDED' }, PUBLISHER, ITEM).verdict, 'succeeded');
  assert.equal(
    assessAsyncUpload({ ...base, lastAsyncUploadState: 'IN_PROGRESS' }, PUBLISHER, ITEM).verdict,
    'in-progress',
    'the workflow loop stays bounded; a stuck IN_PROGRESS times out there and fails closed',
  );
  assert.equal(assessAsyncUpload({ ...base, lastAsyncUploadState: 'FAILED' }, PUBLISHER, ITEM).verdict, 'fail');
  assert.equal(assessAsyncUpload({ ...base, lastAsyncUploadState: 'NOT_FOUND' }, PUBLISHER, ITEM).verdict, 'fail');
  assert.equal(assessAsyncUpload(base, PUBLISHER, ITEM).verdict, 'fail', 'an absent state is unknown, not success');
});

test('publish response must be this item in a lawful staged-submission state', () => {
  const ok = assessPublish({ name: NAME, itemId: ITEM, state: 'PENDING_REVIEW' }, PUBLISHER, ITEM);
  assert.equal(ok.verdict, 'ok');

  const published = assessPublish({ name: NAME, itemId: ITEM, state: 'PUBLISHED' }, PUBLISHER, ITEM);
  assert.equal(published.verdict, 'fail', 'a published result means the owner gate was bypassed');

  assert.equal(assessPublish({ name: NAME, itemId: 'other', state: 'PENDING_REVIEW' }, PUBLISHER, ITEM).verdict, 'fail');
  assert.equal(assessPublish({ name: NAME, itemId: ITEM }, PUBLISHER, ITEM).verdict, 'fail', 'stateless is unprovable');

  const withWarnings = assessPublish(
    { name: NAME, itemId: ITEM, state: 'PENDING_REVIEW', warningInfo: { warnings: ['w1', 'w2'] } },
    PUBLISHER,
    ITEM,
  );
  assert.deepEqual(withWarnings.warnings, ['w1', 'w2'], 'warnings surface from the documented field');
});

test('final submission status must carry this exact version in a non-published state', () => {
  const submitted = (state: string, crxVersion: string): unknown => ({
    name: NAME,
    itemId: ITEM,
    submittedItemRevisionStatus: { state, distributionChannels: [{ crxVersion }] },
  });
  assert.equal(assessSubmission(submitted('PENDING_REVIEW', VERSION), PUBLISHER, ITEM, VERSION).verdict, 'ok');
  assert.equal(assessSubmission(submitted('STAGED', VERSION), PUBLISHER, ITEM, VERSION).verdict, 'ok');
  assert.equal(
    assessSubmission(submitted('PUBLISHED', VERSION), PUBLISHER, ITEM, VERSION).verdict,
    'fail',
    'published is never proof of a staged submission',
  );
  assert.equal(
    assessSubmission(submitted('PENDING_REVIEW', '9.9.9'), PUBLISHER, ITEM, VERSION).verdict,
    'fail',
    'the submitted version must be the dispatched version',
  );
  assert.equal(
    assessSubmission({ name: NAME, itemId: ITEM }, PUBLISHER, ITEM, VERSION).verdict,
    'fail',
    'no submitted revision means the submission did not take',
  );
});
