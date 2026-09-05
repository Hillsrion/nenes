import assert from "node:assert/strict";
import { test } from "node:test";
import { createFruitPilePhysics } from "../utils/fruit-pile-physics";

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`fruit pile settles inside a ${width}×${height} viewport and survives resizing`, () => {
    let seed = 42;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const physics = createFruitPilePhysics(width, height, random);
    const radius = Math.min(72, Math.max(32, width / 20));
    for (let index = 0; index < 26; index += 1) {
      const vertices = Array.from({ length: 16 }, (_, point) => ({
        x: Math.cos(point / 16 * Math.PI * 2) * radius,
        y: Math.sin(point / 16 * Math.PI * 2) * radius * (index % 2 ? 0.7 : 1),
      }));
      physics.add(vertices, index, 26);
    }
    const settle = () => {
      for (let step = 0; step < 2400 && !physics.settled; step += 1) physics.step();
      assert.ok(physics.settled, "all bodies should eventually sleep");
      assert.equal(physics.fruits.length, 26, "the burst never adds or removes fruits");
    };
    const inside = (w: number, h: number) => {
      for (const { body } of physics.fruits) {
        assert.ok(body.bounds.min.x >= -2, "left wall contains fruit");
        assert.ok(body.bounds.max.x <= w + 2, "right wall contains fruit");
        assert.ok(body.bounds.max.y <= h + 2, "floor supports fruit");
        assert.ok(body.bounds.min.y > h * 0.35, "pile remains near the bottom");
      }
    };
    settle();
    inside(width, height);
    const positions = physics.fruits.map(({ body }) => ({ ...body.position }));
    for (let step = 0; step < 120; step += 1) physics.step();
    assert.deepEqual(physics.fruits.map(({ body }) => body.position), positions, "settled pile remains still");
    physics.resize(width * 0.8, height * 0.9);
    settle();
    inside(width * 0.8, height * 0.9);
    physics.dispose();
    assert.equal(physics.fruits.length, 0);
  });
}

for (const [width, height, count] of [[1440, 900, 42], [390, 844, 28]]) {
  test(`right-edge avalanche enters and settles at ${width}×${height}`, () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      let state = seed;
      const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
      const physics = createFruitPilePhysics(width, height, random, "right");
      const radius = Math.min(72, Math.max(32, width / 20));
      for (let index = 0; index < count; index += 1) {
        const body = physics.add(Array.from({ length: 16 }, (_, point) => ({
          x: Math.cos(point / 8 * Math.PI) * radius,
          y: Math.sin(point / 8 * Math.PI) * radius,
        })), index, count);
        assert.ok(body.bounds.min.x > width, "fruit starts outside the right edge");
        assert.ok(body.velocity.x < 0, "fruit spills toward the viewport");
      }
      assert.ok(Math.max(...physics.fruits.map(({ delay }) => delay)) < 1000, "cupboard empties in one short burst");
      for (let step = 0; step < 3600 && !physics.settled; step += 1) physics.step();
      assert.ok(physics.settled, `seed ${seed}: all fruits settle`);
      for (const { body } of physics.fruits) {
        assert.ok(body.bounds.min.x >= -2 && body.bounds.max.x <= width + 2, "fruit stays between the walls");
        assert.ok(body.bounds.max.y <= height + 2, "fruit rests on the floor");
      }
      physics.dispose();
    }
  });
}
