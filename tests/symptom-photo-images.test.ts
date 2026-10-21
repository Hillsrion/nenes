import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import definitions from '../config/symptom-photo-illustrations.json';

test('photos retain opaque nipple coverage even when JavaScript and WebGL are unavailable', async () => {
  for (const [index, definition] of definitions.entries()) {
    const { data, info } = await sharp(new URL(`../public/images/symptoms/updated/symptoms-0${index + 1}.webp`, import.meta.url).pathname)
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width / info.height, 3 / 4);
    for (const [cx, cy, rx, ry, degrees] of definition.points) {
      const angle = degrees! * Math.PI / 180;
      // Check the whole central area, not just a single center pixel: the
      // animated layer may fluctuate or disappear but cannot reveal the nipple.
      for (const x of [-.45, 0, .45]) for (const y of [-.45, 0, .45]) {
        const px = Math.round((cx! + x * rx! * Math.cos(angle) - y * ry! * Math.sin(angle)) / 720 * info.width);
        const py = Math.round((cy! + x * rx! * Math.sin(angle) + y * ry! * Math.cos(angle)) / 960 * info.height);
        const offset = (py * info.width + px) * info.channels;
        [255, 209, 226].forEach((channel, i) => {
          assert.ok(Math.abs(data[offset + i]! - channel) <= 12, `${definition.symptom}: nipple coverage remains pink`);
        });
      }
    }
  }
});

test('static contour fallback leaves the baked nipple points to the underlying photograph', async () => {
  for (const [index, definition] of definitions.entries()) {
    const { data, info } = await sharp(new URL(`../public/images/symptoms/updated/symptoms-0${index + 1}.svg`, import.meta.url).pathname)
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of definition.points) {
      assert.equal(data[(y! * info.width + x!) * info.channels + 3], 0, `${definition.symptom}: no duplicate static nipple point`);
    }
  }
});
