/**
 * Regenerate the Git oracle corpus under `tests/trailers/oracle/`.
 *
 * Real Git is the development oracle for the trailer parser — never a runtime
 * dependency. For every fixture in `tests/trailers/fixtures/` this script
 * records two independent projections:
 *
 *   <name>.parse.txt   `git interpret-trailers --parse` on the fixture bytes
 *   <name>.commit.txt  `%(trailers:only,unfold)` read back from a real commit
 *                      created with `--cleanup=verbatim` (the projection that
 *                      matters at runtime, because Trailer Lens reads
 *                      committed messages)
 *
 * The channels genuinely differ on a few shapes (committed-message parsing
 * honors no `---` patch divider and rejects a message whose first content is
 * the trailer paragraph); `manifest.json` records those divergences by name
 * so they stay visible instead of silently encoded. The commit channel is
 * the parser's contract. Output is deterministic — no timestamps — so
 * regeneration with the same Git version is diff-clean.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixturesDir = join(root, 'tests', 'trailers', 'fixtures');
const oracleDir = join(root, 'tests', 'trailers', 'oracle');
const tmpRepo = join(root, 'artifacts', 'oracle-tmp');

/** Run git with output captured as a UTF-8 string. */
function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options });
}

const gitVersion = git(['--version']).trim();

// Fresh isolated repository for the committed-message channel. Nested under
// the ignored artifacts/ root; parent-repo attributes do not apply inside it.
rmSync(tmpRepo, { recursive: true, force: true });
mkdirSync(tmpRepo, { recursive: true });
git(['init', '-q', '-b', 'main'], { cwd: tmpRepo });
git(['config', 'user.name', 'Oracle'], { cwd: tmpRepo });
git(['config', 'user.email', 'oracle@example.invalid'], { cwd: tmpRepo });
git(['config', 'core.autocrlf', 'false'], { cwd: tmpRepo });

mkdirSync(oracleDir, { recursive: true });

const fixtures = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.txt'))
  .sort();

const divergent = [];
for (const fixture of fixtures) {
  const name = fixture.replace(/\.txt$/, '');
  const input = readFileSync(join(fixturesDir, fixture));

  const parseOut = execFileSync('git', ['interpret-trailers', '--parse'], {
    input,
    encoding: 'utf8',
  });

  const messageFile = join(tmpRepo, 'message.txt');
  writeFileSync(messageFile, input);
  git(['commit', '-q', '--allow-empty', '--cleanup=verbatim', '-F', messageFile], { cwd: tmpRepo });
  const commitOut = git(['log', '-1', '--format=%(trailers:only,unfold)'], { cwd: tmpRepo });

  // %(trailers:...) appends one newline of its own; normalize both channels
  // to a plain newline-terminated (or empty) block for comparison.
  const parseNorm = normalizeBlock(parseOut);
  const commitNorm = normalizeBlock(commitOut);

  writeFileSync(join(oracleDir, `${name}.parse.txt`), parseNorm, 'utf8');
  writeFileSync(join(oracleDir, `${name}.commit.txt`), commitNorm, 'utf8');
  if (parseNorm !== commitNorm) divergent.push(name);
}

function normalizeBlock(text) {
  const trimmed = text.replace(/\n+$/, '');
  return trimmed.length === 0 ? '' : trimmed + '\n';
}

writeFileSync(
  join(oracleDir, 'manifest.json'),
  JSON.stringify(
    {
      gitVersion,
      channels: {
        parse: 'git interpret-trailers --parse < fixture',
        commit: 'git commit --allow-empty --cleanup=verbatim -F fixture; git log -1 --format=%(trailers:only,unfold)',
      },
      fixtures: fixtures.map((fixture) => fixture.replace(/\.txt$/, '')),
      channelDivergences: divergent,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

rmSync(tmpRepo, { recursive: true, force: true });

console.log(
  `Oracle corpus regenerated for ${fixtures.length} fixtures with ${gitVersion}` +
    (divergent.length > 0 ? `; channel divergences recorded: ${divergent.join(', ')}` : '.'),
);
