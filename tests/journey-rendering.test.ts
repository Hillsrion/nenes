import assert from "node:assert/strict";
import test from "node:test";
import { getJourneyRenderFps, nextJourneyRenderTime } from "../utils/journey-rendering";

test("mobile fruit motion uses 60 FPS while the bust retains its lower budget", () => {
  assert.equal(getJourneyRenderFps(true, true, false), 60);
  assert.equal(getJourneyRenderFps(true, false, false), 24);
  assert.equal(getJourneyRenderFps(false, true, false), 60);
});

for (const displayHz of [60, 90, 120]) {
  for (const targetFps of [24, 30, 60]) {
    test(`${targetFps} FPS stays on budget on a ${displayHz} Hz display`, () => {
      let previous = 0;
      let draws = 0;
      for (let frame = 1; frame <= displayHz * 10; frame++) {
        const timestamp = frame * 1000 / displayHz;
        const next = nextJourneyRenderTime(timestamp, previous, targetFps);
        if (next === null) continue;
        previous = next;
        draws++;
      }
      assert.ok(Math.abs(draws - targetFps * 10) <= 1, `rendered ${draws} frames over 10 seconds`);
    });
  }
}
