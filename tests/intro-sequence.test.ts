import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  getIntroState, INTRO_END, INTRO_MOBILE_BACKGROUNDS, INTRO_MOBILE_CUTOUTS,
  INTRO_BACKGROUND_SRCSETS, INTRO_CUTOUT_SRCSETS,
} from '../utils/intro-sequence.ts';

const visible = (time: number) => getIntroState(time).cutouts.map(cutout => cutout.visible);
test('the seven Figma frames preserve the intended foreground stack', () => {
  assert.deepEqual(visible(0), [false, false, false]);
  assert.deepEqual(visible(1.1), [true, false, false]);
  assert.equal(getIntroState(2.2).progress, 1);
  assert.deepEqual(visible(3.15), [true, true, false]);
  assert.deepEqual(visible(4.2), [false, true, false]);
  assert.deepEqual(visible(5.2), [false, true, true]);
  assert.deepEqual(visible(INTRO_END), [false, false, true]);
  assert.equal(getIntroState(INTRO_END).to, 3);
  assert.equal(getIntroState(INTRO_END).progress, 1);
});
test('the latest cutout stays fully settled throughout each background transition', () => {
  for (const [index, start, end] of [[0, 1.25, 2.05], [1, 3.3, 4.1], [2, 5.35, 6.15]]) {
    for (let time = start!; time <= end!; time += 0.02) {
      const state = getIntroState(time);
      assert.deepEqual(state.cutouts[index!], { visible: true, arrival: 1 });
      assert.ok(state.progress >= 0 && state.progress <= 1);
    }
  }
});
test('reverse scrolling and jumps restore the exact same frames without stale layers', () => {
  const times = [0, 0.7, 1.65, 2.7, 3.7, 4.7, 5.8, INTRO_END];
  const forward = times.map(getIntroState);
  for (let i = times.length - 1; i >= 0; i--) assert.deepEqual(getIntroState(times[i]!), forward[i]);
  assert.deepEqual(getIntroState(-1), getIntroState(0));
  assert.deepEqual(getIntroState(NaN), getIntroState(0));
});

test('mobile cutouts keep the full portrait canvas of their arrival photo and real transparency', async () => {
  const photos = await Promise.all(INTRO_MOBILE_BACKGROUNDS.map(src =>
    sharp(new URL(`../public${src}`, import.meta.url).pathname).metadata(),
  ));
  for (const photo of photos) {
    assert.equal(photo.width, 1080);
    assert.equal(photo.height, 1620);
  }
  for (const [index, src] of INTRO_MOBILE_CUTOUTS.entries()) {
    const cutout = sharp(new URL(`../public${src}`, import.meta.url).pathname);
    const metadata = await cutout.metadata();
    assert.equal(metadata.width, photos[index + 1]!.width);
    assert.equal(metadata.height, photos[index + 1]!.height);
    assert.equal(metadata.hasAlpha, true);
    const alpha = (await cutout.stats()).channels[3]!;
    assert.equal(alpha.min, 0, 'the removed room is transparent');
    assert.equal(alpha.max, 255, 'the subjects remain opaque');
  }
});

test('desktop srcset descriptors match real exports and preserve the photo/cutout registration', async () => {
  const inspect = async (srcset: string) => Promise.all(srcset.split(', ').map(async candidate => {
    const [src, descriptor] = candidate.split(' ');
    const image = await sharp(new URL(`../public${src}`, import.meta.url).pathname).metadata();
    assert.equal(image.width, Number(descriptor!.slice(0, -1)), candidate);
    return image;
  }));
  const photos = await Promise.all(INTRO_BACKGROUND_SRCSETS.map(inspect));
  assert.deepEqual(photos[0]!.map(photo => photo.width), [960, 1366], 'never upscale the smaller first original');
  for (const [index, srcset] of INTRO_CUTOUT_SRCSETS.entries()) {
    const cutouts = await inspect(srcset);
    assert.deepEqual(cutouts.map(image => [image.width, image.height]),
      photos[index + 1]!.map(image => [image.width, image.height]));
    assert.deepEqual(cutouts.map(image => image.width), [960, 1366, 1920]);
    assert.ok(cutouts.every(image => image.hasAlpha));
  }
});
