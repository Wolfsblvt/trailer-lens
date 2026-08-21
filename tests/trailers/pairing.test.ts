/**
 * `Co-authored-via` pairing tests: the unique-join rule and every way it
 * must refuse to guess. Convenient proximity never becomes a relation.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseTrailerEvidence } from '../../src/domain/trailers/parse.ts';
import { pairCoAuthorVia, parseRouteContext } from '../../src/domain/trailers/pair-coauthor-via.ts';

const here = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return readFileSync(join(here, 'fixtures', `${name}.txt`), 'utf8');
}

function pairFromMessage(message: string) {
  return pairCoAuthorVia(parseTrailerEvidence(message));
}

test('multi-identity squash pairs each route with its co-author', () => {
  const result = pairCoAuthorVia(parseTrailerEvidence(fixture('27-multi-identity-squash')));
  assert.equal(result.pairs.length, 2);
  const [tala, juno] = result.pairs;
  assert.equal(tala?.person.displayName, 'Tala');
  assert.deepEqual(tala?.route.segments, ['Claude Code', 'Fable 5', 'High']);
  assert.equal(juno?.person.displayName, 'Juno');
  assert.equal(result.unpairedBy.length, 0);
  assert.equal(result.unpairedVia.length, 0);
});

test('single valid pair forms', () => {
  const result = pairCoAuthorVia(parseTrailerEvidence(fixture('36-canary-linked-shape')));
  assert.equal(result.pairs.length, 1);
  assert.equal(result.pairs[0]?.person.email, 'juno@agents.example.com');
});

test('a via line outside the block poisons pairing entirely', () => {
  const result = pairCoAuthorVia(parseTrailerEvidence(fixture('03-blank-inside-paired-block')));
  assert.equal(result.pairs.length, 0);
  assert.equal(result.unpairedBy.length, 1);
});

test('duplicate route identities pair nothing they touch', () => {
  const result = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: Juno | Claude Code | Opus 5 | Max\n' +
      'Co-authored-via: Juno | ChatGPT Web | GPT-5.6 Sol | Pro\n' +
      'Co-authored-by: Juno <juno@example.com>\n',
  );
  assert.equal(result.pairs.length, 0);
  assert.equal(result.unpairedVia.length, 2);
  assert.equal(result.unpairedBy.length, 1);
});

test('duplicate co-author names pair nothing they touch', () => {
  const result = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: Juno | Claude Code | Opus 5 | Max\n' +
      'Co-authored-by: Juno <juno@example.com>\n' +
      'Co-authored-by: Juno <other@example.com>\n',
  );
  assert.equal(result.pairs.length, 0);
});

test('identity match is case-insensitive but never fuzzy', () => {
  const matched = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: juno | Claude Code | Opus 5 | Max\n' +
      'Co-authored-by: Juno <juno@example.com>\n',
  );
  assert.equal(matched.pairs.length, 1);

  const unmatched = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: J. Doe | Claude Code | Opus 5 | Max\n' +
      'Co-authored-by: Doe, J. <doe@example.com>\n',
  );
  assert.equal(unmatched.pairs.length, 0);
  assert.equal(unmatched.unpairedVia.length, 1);
});

test('a co-author without a parseable person value never pairs', () => {
  const result = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: Juno | Claude Code | Opus 5 | Max\n' +
      'Co-authored-by: Juno\n',
  );
  assert.equal(result.pairs.length, 0);
  assert.equal(result.unpairedBy.length, 1);
});

test('an empty route identity never pairs', () => {
  const result = pairFromMessage(
    'Subject\n\nBody.\n\n' +
      'Co-authored-via: | Claude Code | Opus 5 | Max\n' +
      'Co-authored-by: Juno <juno@example.com>\n',
  );
  assert.equal(result.pairs.length, 0);
});

test('route context parsing keeps segments in order and drops empties', () => {
  assert.deepEqual(parseRouteContext('Tala | Claude Code | Fable 5 | XHigh'), {
    identity: 'Tala',
    segments: ['Claude Code', 'Fable 5', 'XHigh'],
  });
  assert.deepEqual(parseRouteContext('Tala'), { identity: 'Tala', segments: [] });
  assert.equal(parseRouteContext('  | Claude Code'), null);
});
