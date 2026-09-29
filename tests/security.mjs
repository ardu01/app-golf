import assert from "assert";
import { readdirSync, readFileSync } from "fs";
import { loadFunctions, readApp } from "./extract.mjs";

const html = readApp();
const api = loadFunctions(html, [
  "clampHcp",
  "clipStr",
  "finiteOrNull",
  "sanitizeScoreMap",
  "sanitizeMarkMap",
  "sanitizeMe",
  "sanitizeCreative",
  "sanitizeImportedPlayer",
  "sanitizeImportedRound",
  "validateFairwayBackup"
]);
const escapeSrc = html.slice(html.indexOf("function escapeHtml"), html.indexOf("function fmtStoredNum"));
const escapeHtml = new Function(escapeSrc + "\nreturn escapeHtml;")();

assert.strictEqual(api.clipStr("a<b>\u0000c", 20), "abc");
assert.strictEqual(api.clipStr(null, 4), "");
assert.strictEqual(api.clipStr("abcdef", 3), "abc");
assert.strictEqual(escapeHtml(`<img src=x onerror=alert(1)>"'`), "&lt;img src=x onerror=alert(1)&gt;&quot;&#39;");

const hostile = api.validateFairwayBackup({
  version: 3,
  rounds: [{
    id: "r1",
    club: "<svg onload=alert(1)>",
    players: [{ id: "p1", name: "Ana<script>", scores: { 1: 4 } }]
  }]
});
assert.strictEqual(hostile.ok, true);
assert.ok(!JSON.stringify(hostile.data).includes("<"));
assert.ok(!JSON.stringify(hostile.data).includes(">"));

assert.ok(html.includes('aria-label="Versión">4.2.2</span>'));
assert.ok(html.includes('appVersion: "4.2.2"'));
assert.ok(html.includes("version: 3"));
const manifest = readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(manifest.includes("4.2.2"));
assert.ok(sw.includes('const SHELL = "fairway-v4-422"'));
assert.ok(html.includes('const FAIRWAY_DRIVE_CLIENT_ID = "429682128465-06rq4tc60pmo6r0808a8b27itcp9v9dv.apps.googleusercontent.com"'));
assert.ok(!html.includes("client_secret"));
assert.ok(!html.includes("refresh_token"));
assert.ok(html.includes('id="holeCallCaddie"'));
assert.ok(html.includes("tel:+34918905111"));
assert.ok(!html.includes('id="holeBagBtn"'));
assert.ok(!html.includes("fairway.bag.v1"));
assert.ok(!html.includes("fairway/js/caddie.js"));
assert.ok(!sw.includes("caddie.js"));

const workflows = readdirSync(new URL("../.github/workflows/", import.meta.url));
for (const name of workflows) {
  const text = readFileSync(new URL("../.github/workflows/" + name, import.meta.url), "utf8");
  const code = text.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
  assert.ok(!/\bgit push\b/.test(code), name + " todavía empuja");
  if (name !== "test-fairway.yml") {
    assert.ok(code.includes("if: false"), name);
    assert.ok(!code.includes("workflow_dispatch"), name);
  }
}

console.log("security ok");
