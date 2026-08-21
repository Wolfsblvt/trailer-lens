/**
 * Package verification: extract the built ZIP and prove what actually ships.
 *
 * - the entry set is exactly the expected allowlist, manifest at ZIP root;
 * - the extracted manifest parses and matches package.json's version;
 * - no shipped JavaScript contains eval/new Function, network constructors,
 *   remote script URLs, source-map pointers, or source-machine paths;
 * - the ZIP digest matches the emitted .sha256 file; and
 * - extraction goes to artifacts/packages/extracted/ so the browser smoke
 *   can load exactly the extracted bytes.
 *
 * Extraction uses the system unzip via PowerShell Expand-Archive fallback to
 * Node inflate — implemented here directly with zlib to stay dependency-free.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'artifacts', 'packages');

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const zipName = `trailer-lens-${version}.zip`;
const zipPath = join(outDir, zipName);
const zip = readFileSync(zipPath);

const EXPECTED = [
  '_locales/en/messages.json',
  'content.js',
  'icons/icon-128.png',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'manifest.json',
  'options.css',
  'options.html',
  'options.js',
  'trailer-lens.css',
];

/** Parse local-file entries; the package writer emits only method 8. */
function readEntries(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength);
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method !== 8) throw new Error(`unexpected compression method ${method} for ${name}`);
    entries.push({ name, data: inflateRawSync(data) });
    offset = dataStart + compressedSize;
  }
  return entries;
}

const entries = readEntries(zip);
const names = entries.map((entry) => entry.name).sort();
if (JSON.stringify(names) !== JSON.stringify([...EXPECTED].sort())) {
  throw new Error(`ZIP entries differ from allowlist.\nExpected: ${EXPECTED.join(', ')}\nActual: ${names.join(', ')}`);
}

const manifestEntry = entries.find((entry) => entry.name === 'manifest.json');
const manifest = JSON.parse(manifestEntry.data.toString('utf8'));
if (manifest.manifest_version !== 3) throw new Error('manifest_version must be 3');
if (manifest.version !== version) {
  throw new Error(`packaged manifest version ${manifest.version} differs from package.json ${version}`);
}
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage'])) {
  throw new Error(`unexpected permissions: ${JSON.stringify(manifest.permissions)}`);
}
if ('host_permissions' in manifest) throw new Error('host_permissions must not be declared');

// Forbidden-content scan over shipped text files. The SVG namespace URL and
// the manifest's own content-script match pattern are the only legitimate
// remote-looking strings in the package — neither is a fetched resource.
const ALLOWED_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml',
  'https://github.com/*',
  // URL-parsing base in memory/keys.ts (template literal, not a fetch target).
  'https://${pageHost}',
]);
const FORBIDDEN = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\s*\(/,
  /\bfetch\s*\(/,
  /sourceMappingURL/,
  /[A-Za-z]:\\\\|[A-Za-z]:\\(?:code|Users)/,
  /\/home\/|\/Users\//,
];
for (const entry of entries) {
  if (!/\.(js|css|html|json)$/.test(entry.name)) continue;
  const text = entry.data.toString('utf8');
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) throw new Error(`${entry.name} matches forbidden pattern ${pattern}`);
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    if (!ALLOWED_URLS.has(match[0])) throw new Error(`${entry.name} contains remote URL ${match[0]}`);
  }
}

// Digest must match the emitted .sha256.
const digest = createHash('sha256').update(zip).digest('hex');
const recorded = readFileSync(join(outDir, `trailer-lens-${version}.sha256`), 'utf8').split(' ')[0];
if (digest !== recorded) throw new Error(`digest mismatch: computed ${digest}, recorded ${recorded}`);

// Extract for the packaged-browser smoke.
const extractDir = join(outDir, 'extracted');
rmSync(extractDir, { recursive: true, force: true });
for (const entry of entries) {
  const target = join(extractDir, entry.name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, entry.data);
}

console.log(`Verified ${zipName}: ${entries.length} allowlisted files, digest ${digest.slice(0, 16)}…, extracted to artifacts/packages/extracted/`);
