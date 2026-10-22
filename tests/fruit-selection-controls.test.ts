import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import * as Vue from "vue";
import { parse, compileScript } from "vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";
import * as catalog from "../config/bust-fruit-catalog";
import * as motion from "../utils/fruit-selection-motion";
import * as taps from "../utils/tap-activation";

const { descriptor } = parse(readFileSync(new URL("../components/sections/FruitSelectionSection.vue", import.meta.url), "utf8"));
let script = stripTypeScriptTypes(compileScript(descriptor, { id: "fruit-selection-test", inlineTemplate: true }).content);
script = script.replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, module) => {
  const dependency = module === "vue" ? "Vue" : module.includes("bust-fruit-catalog") ? "catalog" : module.includes("fruit-selection-motion") ? "motion" : "taps";
  return `const {${names.replace(/\bas\b/g, ":")}} = ${dependency};`;
}).replace("export default", "const Component =");
const Component = runInNewContext(`${script}\nComponent`, { Vue, catalog, motion, taps, ref: Vue.ref });
const props = { active: true, continuing: false, selectedFruit: "orange", selectedIndex: 0,
  hoveredIndex: -1, modelFile: "demo.glb", sceneReady: false, landedCount: 0 };

test("a pending or unavailable WebGL scene cannot disable fruit selection or Continue", async () => {
  const html = await renderToString(Vue.createSSRApp(Component, props));
  const buttons = html.match(/<button\b[^>]*>/g)!;
  assert.equal(buttons.length, catalog.journeyFruitChoices.length + 1);
  assert.ok(buttons.every(button => !/\sdisabled(?:=|[\s>])/.test(button)));
  assert.ok(html.includes("Moyen"), "the size remains visible without a rendered fruit");
  assert.ok(html.includes("Gros"));
});

test("an in-flight transition disables selection but leaves its escape button operable", async () => {
  const html = await renderToString(Vue.createSSRApp(Component, { ...props, continuing: true, modelWaitExpired: true }));
  const buttons = html.match(/<button\b[^>]*>/g)!;
  assert.ok(buttons.slice(0, -1).every(button => /\sdisabled(?:=|[\s>])/.test(button)));
  assert.ok(!/\sdisabled(?:=|[\s>])/.test(buttons.at(-1)!));
});
