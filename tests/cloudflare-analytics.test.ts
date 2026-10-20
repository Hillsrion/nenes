import { test } from "node:test";
import assert from "node:assert/strict";
import { getAudienceEventsEndpoint, getCloudflareBeaconConfig, isAudienceTrackingAllowed } from "../utils/cloudflare-analytics.ts";

const options = {
  token: "0123456789abcdef0123456789abcdef",
  hosts: "nenes.fr,www.nenes.fr",
  url: "https://nenes.fr/",
  development: false,
};

test("production audience pages use the Cloudflare beacon with SPA tracking", () => {
  for (const url of ["https://nenes.fr/", "https://www.nenes.fr/links", "https://nenes.fr/?utm_source=instagram"]) {
    assert.deepEqual(getCloudflareBeaconConfig({ ...options, url }), { token: options.token, spa: true });
  }
});

test("missing configuration, local development and other hosts never collect visits", () => {
  for (const override of [
    { token: "" }, { token: "not-a-site-token" }, { hosts: "" },
    { development: true }, { url: "http://nenes.fr/" },
    { url: "http://localhost:3000/" }, { url: "https://develop--nenes.netlify.app/" },
    { url: "https://nenes.fr.evil.example/" }, { url: "invalid" },
  ]) {
    assert.equal(getCloudflareBeaconConfig({ ...options, ...override }), null);
  }
});

test("private photo and model tools and debug previews do not start the beacon", () => {
  for (const path of ["/studio-3d", "/models-3d", "/fruits", "/loading-3d", "/?studio3d=upload", "/?preview3d=photo", "/?journeyDebug=1", "/?model=private.glb"]) {
    assert.equal(getCloudflareBeaconConfig({ ...options, url: `https://nenes.fr${path}` }), null);
  }
});

test("browser privacy preferences disable audience measurement", () => {
  assert.equal(getCloudflareBeaconConfig({ ...options, doNotTrack: "1" }), null);
  assert.equal(getCloudflareBeaconConfig({ ...options, globalPrivacyControl: true }), null);
});

test("interaction tracking is independent of the Web Analytics site token", () => {
  const { token, ...withoutToken } = options;
  assert.equal(isAudienceTrackingAllowed(withoutToken), true);
  assert.equal(isAudienceTrackingAllowed({ ...options, doNotTrack: "1" }), false);
  assert.equal(isAudienceTrackingAllowed({ ...options, url: "https://nenes.fr/studio-3d" }), false);
});

test("collector URLs must use HTTPS without credentials, parameters or fragments", () => {
  assert.equal(getAudienceEventsEndpoint("https://nenes-analytics.example.workers.dev/events"), "https://nenes-analytics.example.workers.dev/events");
  for (const value of ["", "/events", "http://example.com/events", "https://secret@example.com/events", "https://example.com/events?token=secret", "https://example.com/events#fragment", "https://example.com/other"]) {
    assert.equal(getAudienceEventsEndpoint(value), null);
  }
});
