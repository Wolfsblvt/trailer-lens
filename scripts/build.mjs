/**
 * Build `dist/` as the complete unpacked extension: bundled scripts, static
 * pages and styles, the manifest, locales, and icons. Bundles ship readable
 * and unminified — the Chrome Web Store package is reviewed by humans and
 * the AGPL corresponding-source story depends on it staying legible.
 *
 * The manifest at the repository root is the authoritative source; the
 * build verifies its version against `package.json` and copies it verbatim.
 */

import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.version !== packageJson.version) {
  throw new Error(
    `Version mismatch: manifest.json has ${manifest.version}, package.json has ${packageJson.version}.`,
  );
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [
    { in: join(root, 'src', 'content', 'main.ts'), out: 'content' },
    { in: join(root, 'src', 'options', 'options.ts'), out: 'options' },
  ],
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: false,
  sourcemap: false,
  legalComments: 'inline',
});

cpSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
cpSync(join(root, '_locales'), join(dist, '_locales'), { recursive: true });
cpSync(join(root, 'src', 'presentation', 'trailer-lens.css'), join(dist, 'trailer-lens.css'));
cpSync(join(root, 'src', 'options', 'options.html'), join(dist, 'options.html'));
cpSync(join(root, 'src', 'options', 'options.css'), join(dist, 'options.css'));
if (existsSync(join(root, 'assets', 'icons'))) {
  cpSync(join(root, 'assets', 'icons'), join(dist, 'icons'), { recursive: true });
}

// Every file the manifest references must exist in dist, or the unpacked
// extension will not load.
const referenced = [
  ...manifest.content_scripts.flatMap((script) => [...script.js, ...script.css]),
  manifest.options_ui.page,
  ...Object.values(manifest.icons ?? {}),
];
for (const file of referenced) {
  if (!existsSync(join(dist, file))) {
    throw new Error(`manifest references ${file}, which is missing from dist/`);
  }
}

console.log(`Built dist/ for version ${manifest.version}.`);
