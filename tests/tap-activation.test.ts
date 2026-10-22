import assert from "node:assert/strict";
import test from "node:test";
import { createTapActivation } from "../utils/tap-activation";

function pointer(overrides: Record<string, unknown> = {}) {
  return { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0,
    currentTarget: target, clientX: 120, clientY: 600, timeStamp: 100, ...overrides } as unknown as PointerEvent;
}
const target = {} as EventTarget;

test("a touch tap activates without waiting for a compatibility click", () => {
  const tap = createTapActivation();
  let count = 0;
  tap.down(pointer());
  tap.up(pointer({ clientY: 602, timeStamp: 150 }), () => count++);
  assert.equal(count, 1);
  tap.click({ currentTarget: target, timeStamp: 170, detail: 1 } as MouseEvent, () => count++);
  assert.equal(count, 1, "a subsequent native click must not activate twice");
});

test("touch drags, cancelled gestures and releases over another control do not activate", () => {
  const tap = createTapActivation();
  const fail = () => assert.fail("a scroll gesture must not select a fruit");
  tap.down(pointer());
  tap.move(pointer({ clientY: 640 }));
  tap.up(pointer(), fail);
  tap.click({ currentTarget: target, timeStamp: 170, detail: 1 } as MouseEvent, fail);
  tap.down(pointer());
  tap.cancel();
  tap.up(pointer(), fail);
  tap.down(pointer());
  tap.up(pointer({ currentTarget: {} }), fail);
  tap.down(pointer());
  tap.up(pointer({ clientX: 160 }), fail);
});

test("keyboard, mouse and assistive technology keep their native click activation", () => {
  const tap = createTapActivation();
  let count = 0;
  tap.down(pointer({ pointerType: "mouse" }));
  tap.up(pointer({ pointerType: "mouse" }), () => count++);
  assert.equal(count, 0);
  tap.click({ currentTarget: target, timeStamp: 150, detail: 1 } as MouseEvent, () => count++);
  tap.click({ currentTarget: target, timeStamp: 160, detail: 0 } as MouseEvent, () => count++);
  assert.equal(count, 2);
});

test("multi-touch does not activate and later intentional taps remain available", () => {
  const tap = createTapActivation();
  let count = 0;
  tap.down(pointer({ isPrimary: false }));
  tap.up(pointer(), () => count++);
  assert.equal(count, 0);
  for (const timeStamp of [200, 1100]) {
    tap.down(pointer({ timeStamp }));
    tap.up(pointer({ timeStamp: timeStamp + 50 }), () => count++);
  }
  assert.equal(count, 2);
});
