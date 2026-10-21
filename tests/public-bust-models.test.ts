import assert from "node:assert/strict";
import test from "node:test";
import { probePublicBustModelFiles } from "../server/utils/public-bust-models";
import { journeyFruitChoices, resolveJourneyFruitModel } from "../config/bust-fruit-catalog";

test("a deployment without listing credentials can select distinct published journey models", async () => {
  const medium = journeyFruitChoices[0].modelBinding;
  const large = journeyFruitChoices[1].modelBinding;
  const paths = new Set([medium, large, `optimized/${medium}`]);
  const requests: string[] = [];
  const request: typeof fetch = async (input, options) => {
    assert.equal(options?.method, "HEAD");
    assert.ok(options?.signal);
    const url = String(input);
    requests.push(url);
    return new Response(null, { status: paths.has(url.split("/models/")[1]!) ? 200 : 404 });
  };
  const files = await probePublicBustModelFiles("https://models.example/", [
    "bust-orange.glb", "bust-pamplemousse.glb", medium, large, medium,
  ], request);
  assert.deepEqual(files, [medium, `optimized/${medium}`, large]);
  assert.equal(resolveJourneyFruitModel("orange", files, medium), medium);
  assert.equal(resolveJourneyFruitModel("pamplemousse", files, medium), large);
  assert.equal(requests.filter(url => url.endsWith(`/models/${medium}`)).length, 1);
});

test("missing or unreachable models preserve the demo fallback and unsafe names are ignored", async () => {
  const requested: string[] = [];
  const files = await probePublicBustModelFiles("https://models.example", [
    "bust-orange.glb", "bust-pamplemousse.glb", "../private.glb", "https://other.example/model.glb", "",
  ], async input => {
    requested.push(String(input));
    if (String(input).endsWith("bust-orange.glb")) throw new Error("network unavailable");
    return new Response(null, { status: 404 });
  });
  assert.deepEqual(files, []);
  assert.equal(requested.length, 2);
  assert.equal(resolveJourneyFruitModel("orange", files, "demo.glb"), "demo.glb");
  assert.deepEqual(await probePublicBustModelFiles("", ["bust-orange.glb"], async () => {
    assert.fail("no requests without a public URL");
  }), []);
});
