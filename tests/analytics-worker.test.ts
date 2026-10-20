import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type AnalyticsEnvironment } from "../cloudflare/analytics/worker.ts";

const origin = "https://nenes.ismaelsebbane.com";
const event = { name: "resource_click", target: "ruban-rose:website", page: "/" };
const payload = JSON.stringify({ version: 1, events: [event] });

function setup() {
  const points: unknown[] = [];
  const rateKeys: string[] = [];
  const env: AnalyticsEnvironment = {
    ALLOWED_ORIGIN: origin,
    EVENTS: { writeDataPoint: (point) => { points.push(point); } },
    RATE_LIMITER: { limit: async ({ key }) => { rateKeys.push(key); return { success: true }; } },
  };
  return { env, points, rateKeys };
}

function request(body = payload, headers: Record<string, string> = {}) {
  return new Request("https://collector.example/events", {
    method: "POST", body,
    headers: { Origin: origin, "Content-Type": "text/plain;charset=UTF-8", "CF-Connecting-IP": "192.0.2.1", ...headers },
  });
}

test("a real beacon-style POST writes only the documented aggregate dimensions", async () => {
  const { env, points, rateKeys } = setup();
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(points, [{
    indexes: ["nenes.ismaelsebbane.com:resource_click:ruban-rose:website"],
    blobs: ["1", "nenes.ismaelsebbane.com", "/", "resource_click", "ruban-rose:website"], doubles: [1],
  }]);
  assert.deepEqual(rateKeys, ["nenes-analytics:192.0.2.1"]);
  assert.equal(JSON.stringify(points).includes("192.0.2.1"), false);
});

test("other sites, missing origins and unsupported methods cannot write events", async () => {
  const { env, points } = setup();
  for (const Origin of ["https://evil.example", "https://nenes.ismaelsebbane.com.evil.example", "null", ""]) {
    const response = await worker.fetch(request(payload, { Origin }), env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
  }
  assert.equal((await worker.fetch(new Request("https://collector.example/events", { headers: { Origin: origin } }), env)).status, 405);
  assert.equal((await worker.fetch(new Request("https://collector.example/"), env)).status, 404);
  assert.deepEqual(points, []);
});

test("CORS preflight accepts only the production origin and never stores data", async () => {
  const { env, points } = setup();
  const response = await worker.fetch(new Request("https://collector.example/events", { method: "OPTIONS", headers: { Origin: origin } }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal(response.headers.has("Access-Control-Allow-Credentials"), false);
  assert.deepEqual(points, []);
});

test("invalid JSON, unsupported schema, sensitive extras and oversized bodies are rejected without writes", async () => {
  const { env, points } = setup();
  for (const body of ["{", JSON.stringify({ version: 1, events: [{ ...event, email: "private@example.com" }] }), JSON.stringify({ version: 1, events: [event, { ...event, page: "/studio-3d" }] })]) {
    assert.equal((await worker.fetch(request(body), env)).status, 400);
  }
  assert.equal((await worker.fetch(request("é".repeat(2200)), env)).status, 413);
  assert.equal((await worker.fetch(request(payload, { "Content-Type": "application/x-www-form-urlencoded" }), env)).status, 415);
  assert.deepEqual(points, []);
});

test("browser privacy headers and rate limits prevent collection", async () => {
  const { env, points } = setup();
  for (const headers of [{ DNT: "1" }, { "Sec-GPC": "1" }]) {
    assert.equal((await worker.fetch(request(payload, headers), env)).status, 204);
  }
  env.RATE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(request(), env)).status, 429);
  assert.deepEqual(points, []);
});

test("an unavailable Cloudflare binding returns failure instead of pretending to store data", async () => {
  const { env } = setup();
  env.EVENTS.writeDataPoint = () => { throw new Error("Unavailable"); };
  assert.equal((await worker.fetch(request(), env)).status, 503);
});
