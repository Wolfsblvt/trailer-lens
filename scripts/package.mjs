/**
 * Deterministic Store package: zip the built `dist/` into
 * `artifacts/packages/trailer-lens-<version>.zip` with sorted entries,
 * fixed timestamps, and forward-slash paths, then emit a SHA-256 file and
 * a JSON inventory of every packaged byte.
 *
 * The expected file set is explicit — an unexpected file in dist/ fails the
 * run instead of shipping. The script never rebuilds: what gets packaged is
 * exactly what was built and tested (zip format after the deterministic
 * packager in Wolf's xkcd-reading-tracker, reworked).
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const outDir = join(root, 'artifacts', 'packages');

export const EXPECTED_PACKAGE_FILES = Object.freeze([
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
]);

function listFiles(base, current = base) {
  const entries = [];
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, item.name);
    if (item.isDirectory()) entries.push(...listFiles(base, path));
    else entries.push(relative(base, path).replaceAll('\\', '/'));
  }
  return entries.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Fixed DOS timestamp (2026-01-01 00:00 UTC) for byte-stable archives. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const data = readFileSync(join(dist, file));
    const compressed = deflateRawSync(data, { level: 9 });
    const nameBuffer = Buffer.from(file, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

if (!existsSync(join(dist, 'manifest.json'))) {
  throw new Error('dist/ is missing — run `npm run build` first; packaging never rebuilds.');
}
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.version !== packageJson.version) {
  throw new Error(`Version mismatch: manifest ${manifest.version} vs package.json ${packageJson.version}.`);
}

const actual = listFiles(dist);
const expected = [...EXPECTED_PACKAGE_FILES];
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `dist/ contents differ from the expected package set.\nExpected: ${expected.join(', ')}\nActual:   ${actual.join(', ')}`,
  );
}

const zip = createZip(actual);
mkdirSync(outDir, { recursive: true });
const zipName = `trailer-lens-${manifest.version}.zip`;
const zipPath = join(outDir, zipName);
writeFileSync(zipPath, zip);

const zipDigest = createHash('sha256').update(zip).digest('hex');
writeFileSync(join(outDir, `trailer-lens-${manifest.version}.sha256`), `${zipDigest} *${zipName}\n`);

const inventory = {
  name: zipName,
  version: manifest.version,
  packageSha256: zipDigest,
  files: actual.map((file) => {
    const data = readFileSync(join(dist, file));
    return { path: file, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  }),
};
writeFileSync(
  join(outDir, `trailer-lens-${manifest.version}.inventory.json`),
  JSON.stringify(inventory, null, 2) + '\n',
);

console.log(`Packaged ${zipName} (${zip.length} bytes, ${actual.length} files)`);
console.log(`SHA-256 ${zipDigest}`);
