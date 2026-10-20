import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIENCE_SECTIONS, createAudienceEventBuffer, parseAudienceBatch, parseAudienceEvent } from "../utils/audience-events.ts";

const event = { name: "section_view", target: "entry", page: "/" };

test("a section is counted once even when revisited after sending a batch", () => {
  const buffer = createAudienceEventBuffer();
  assert.equal(buffer.add(event), true);
  assert.deepEqual(buffer.take(), [event]);
  assert.equal(buffer.add(event), false);
  assert.deepEqual(buffer.take(), []);
  for (const target of AUDIENCE_SECTIONS.slice(1)) assert.equal(buffer.add({ ...event, target }), true);
  assert.equal(buffer.take().length, AUDIENCE_SECTIONS.length - 1);
});

test("resource clicks are counted independently and bounded per document", () => {
  const buffer = createAudienceEventBuffer();
  const click = { name: "resource_click", target: "cancer-info:phone", page: "/" };
  for (let i = 0; i < 100; i++) {
    assert.equal(buffer.add(click), true);
    assert.deepEqual(buffer.take(), [click]);
  }
  assert.equal(buffer.add(click), false);
});

test("free-form data, private paths, photos and detailed symptom choices cannot enter the payload", () => {
  for (const input of [
    null, [], "entry", { ...event, page: "/studio-3d" },
    { ...event, target: "nipple-discharge" }, { ...event, name: "model_choice" },
    { ...event, email: "private@example.com" }, { ...event, photo: "private.jpg" },
    { ...event, target: "https://example.com/?private=data" },
  ]) assert.equal(parseAudienceEvent(input), null);
});

test("batches require the current schema and reject the whole batch if any event is invalid", () => {
  assert.deepEqual(parseAudienceBatch({ version: 1, events: [event] }), [event]);
  for (const input of [
    { version: 2, events: [event] }, { version: 1, events: [] },
    { version: 1, events: Array(11).fill(event) },
    { version: 1, events: [event, { ...event, target: "private-value" }] },
    { version: 1, events: [event], sessionId: "tracking-id" },
  ]) assert.equal(parseAudienceBatch(input), null);
});
