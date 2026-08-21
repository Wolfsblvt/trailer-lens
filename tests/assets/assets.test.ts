/**
 * Committed-asset contract: every generated raster asset exists with the
 * exact dimensions the manifest, Chrome Web Store, and GitHub require, and
 * stays within upload-friendly sizes. Guards against a regenerated source
 * silently shipping the wrong geometry.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function pngDimensions(path: string): { width: number; height: number; bytes: number } {
  const png = readFileSync(join(root, path));
  assert.equal(png.readUInt32BE(0), 0x89504e47, `${path} is not a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length };
}

test('extension icons have the manifest sizes', () => {
  for (const size of [16, 32, 48, 128]) {
    const dim = pngDimensions(`assets/icons/icon-${size}.png`);
    assert.deepEqual({ width: dim.width, height: dim.height }, { width: size, height: size });
  }
});

test('store promotional assets have Chrome-required dimensions', () => {
  const small = pngDimensions('assets/store/promo/small-promo-440x280.png');
  assert.deepEqual({ width: small.width, height: small.height }, { width: 440, height: 280 });
  const marquee = pngDimensions('assets/store/promo/marquee-promo-1400x560.png');
  assert.deepEqual({ width: marquee.width, height: marquee.height }, { width: 1400, height: 560 });
});

test('GitHub social preview has recommended dimensions and upload size', () => {
  const social = pngDimensions('assets/social/github-social-preview-1280x640.png');
  assert.deepEqual({ width: social.width, height: social.height }, { width: 1280, height: 640 });
  assert.ok(social.bytes < 1024 * 1024, 'social preview must stay under 1 MB');
});

test('manifest icon references match committed files', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
    icons: Record<string, string>;
  };
  for (const [size, path] of Object.entries(manifest.icons)) {
    // Manifest paths are dist-relative; the committed sources live in assets/.
    const dim = pngDimensions(`assets/${path}`);
    assert.equal(dim.width, Number(size));
  }
});
