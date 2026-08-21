/**
 * Strict-parser tests.
 *
 * The primary gate is oracle conformance: for every fixture in `fixtures/`,
 * the parser's canonical projection must equal Git's own committed-message
 * projection (`%(trailers:only,unfold)`) recorded in `oracle/`. The commit
 * channel is authoritative because Trailer Lens reads committed messages.
 * Structural assertions then pin what the oracle cannot see: raw lines,
 * ranges, candidates, diagnostics, and bounds.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { LIMITS } from '../../src/domain/trailers/limits.ts';
import { parseTrailerEvidence } from '../../src/domain/trailers/parse.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');
const oracleDir = join(here, 'oracle');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, `${name}.txt`), 'utf8');
}

function oracle(name: string): string {
  return readFileSync(join(oracleDir, `${name}.commit.txt`), 'utf8');
}

/** The projection Git's `%(trailers:only,unfold)` emits for a block. */
function project(name: string): string {
  const evidence = parseTrailerEvidence(fixture(name));
  const block = evidence.strictBlock;
  if (block === null || block.entries.length === 0) return '';
  return block.entries.map((entry) => `${entry.rawKey}: ${entry.unfoldedValue}`).join('\n') + '\n';
}

test('every fixture matches the committed-message oracle projection', () => {
  const names = readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.txt'))
    .map((file) => file.replace(/\.txt$/, ''));
  assert.ok(names.length >= 40, `expected a full corpus, found ${names.length}`);
  for (const name of names) {
    assert.equal(project(name), oracle(name), `oracle mismatch for fixture ${name}`);
  }
});

test('standard block: entries, ranges, raw text, recognition', () => {
  const evidence = parseTrailerEvidence(fixture('01-standard-block'));
  const block = evidence.strictBlock;
  assert.ok(block);
  assert.equal(block.recognition, 'all-trailer-lines');
  assert.equal(block.entries.length, 2);
  const [reviewed, tested] = block.entries;
  assert.equal(reviewed?.rawKey, 'Reviewed-by');
  assert.equal(reviewed?.normalizedKey, 'reviewed-by');
  assert.equal(reviewed?.startLine, 4);
  assert.equal(tested?.endLine, 5);
  assert.equal(block.startLine, 4);
  assert.equal(block.endLine, 5);
  assert.equal(
    block.rawText,
    'Reviewed-by: Alice <alice@example.com>\nTested-by: Bob <bob@example.com>',
  );
  assert.equal(evidence.nearbyCandidates.length, 0);
  assert.equal(evidence.diagnostics.length, 0);
});

test('canary shape: blank line drops the via line into nearby candidates', () => {
  const evidence = parseTrailerEvidence(fixture('03-blank-inside-paired-block'));
  const block = evidence.strictBlock;
  assert.ok(block);
  assert.equal(block.entries.length, 1);
  assert.equal(block.entries[0]?.rawKey, 'Co-authored-by');
  assert.equal(evidence.nearbyCandidates.length, 1);
  const candidate = evidence.nearbyCandidates[0];
  assert.equal(candidate?.rawKey, 'Co-authored-via');
  assert.equal(candidate?.value, 'Juno | Claude Code | Opus 5 | Max');
  assert.deepEqual(
    evidence.diagnostics.map((diagnostic) => diagnostic.code),
    ['outside-final-block'],
  );
});

test('whitespace-only separator is detected and named', () => {
  const evidence = parseTrailerEvidence(fixture('33-whitespace-only-separator'));
  assert.ok(evidence.strictBlock);
  assert.equal(evidence.nearbyCandidates.length, 1);
  assert.deepEqual(
    evidence.diagnostics.map((diagnostic) => diagnostic.code).sort(),
    ['outside-final-block', 'whitespace-only-separator'],
  );
});

test('multi-identity squash preserves source order and repeats', () => {
  const evidence = parseTrailerEvidence(fixture('27-multi-identity-squash'));
  const block = evidence.strictBlock;
  assert.ok(block);
  assert.deepEqual(
    block.entries.map((entry) => entry.rawKey),
    ['Co-authored-via', 'Co-authored-via', 'Co-authored-by', 'Co-authored-by'],
  );
  assert.deepEqual(
    block.entries.map((entry) => entry.unfoldedValue),
    [
      'Tala | Claude Code | Fable 5 | High',
      'Juno | Claude Code | Opus 5 | Max',
      'Tala <tala@example.com>',
      'Juno <juno@example.com>',
    ],
  );
});

test('repeated keys keep original casing per entry', () => {
  const evidence = parseTrailerEvidence(fixture('04-repeated-keys-casing'));
  assert.deepEqual(
    evidence.strictBlock?.entries.map((entry) => entry.rawKey),
    ['Reviewed-by', 'reviewed-BY', 'Reviewed-by'],
  );
});

test('continuations preserve raw lines and unfold with single spaces', () => {
  const evidence = parseTrailerEvidence(fixture('07-continuations'));
  const context = evidence.strictBlock?.entries[0];
  assert.ok(context);
  assert.equal(context.unfoldedValue, 'first line second line third line');
  assert.deepEqual(context.rawLines, ['Context: first line', ' second line', '\tthird line']);
  assert.equal(context.startLine, 4);
  assert.equal(context.endLine, 6);
});

test('CRLF input parses identically to LF', () => {
  const evidence = parseTrailerEvidence(fixture('08-crlf-block'));
  assert.equal(evidence.strictBlock?.entries.length, 2);
  assert.equal(evidence.strictBlock?.entries[0]?.unfoldedValue, 'Alice <alice@example.com>');
});

test('hostile HTML stays inert text in the model', () => {
  const evidence = parseTrailerEvidence(fixture('29-hostile-html-values'));
  const values = evidence.strictBlock?.entries.map((entry) => entry.unfoldedValue) ?? [];
  assert.equal(values[0], '<script>alert(1)</script>');
  assert.equal(values[1], 'javascript:alert(2)');
});

test('oversized message fails closed with a diagnostic', () => {
  const huge = 'Subject\n\n' + 'x'.repeat(LIMITS.maxMessageChars + 1);
  const evidence = parseTrailerEvidence(huge);
  assert.equal(evidence.strictBlock, null);
  assert.deepEqual(evidence.diagnostics, [{ code: 'message-too-large' }]);
});

test('long messages parse only the tail and say so', () => {
  const filler = 'line of ordinary body text\n'.repeat(3000);
  const message = `Subject\n\n${filler}\nReviewed-by: Alice <alice@example.com>\n`;
  const evidence = parseTrailerEvidence(message);
  assert.equal(evidence.strictBlock?.entries[0]?.rawKey, 'Reviewed-by');
  assert.ok(evidence.diagnostics.some((diagnostic) => diagnostic.code === 'tail-truncated'));
  // Line numbers stay absolute within the full message.
  const entry = evidence.strictBlock?.entries[0];
  assert.equal(entry?.startLine, 3003);
});

test('entry count is capped with a diagnostic', () => {
  const block = Array.from({ length: LIMITS.maxEntries + 10 }, (_, i) => `Key-${i}: v`).join('\n');
  const evidence = parseTrailerEvidence(`Subject\n\nBody.\n\n${block}\n`);
  assert.equal(evidence.strictBlock?.entries.length, LIMITS.maxEntries);
  assert.ok(evidence.diagnostics.some((diagnostic) => diagnostic.code === 'entries-truncated'));
});

test('empty and whitespace-only values survive with exact projection', () => {
  const evidence = parseTrailerEvidence(fixture('06-empty-value'));
  assert.equal(evidence.strictBlock?.entries[0]?.rawKey, 'Fixes');
  assert.equal(evidence.strictBlock?.entries[0]?.unfoldedValue, '');
});
