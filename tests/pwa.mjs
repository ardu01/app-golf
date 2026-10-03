import assert from "assert";
import { readFileSync } from "fs";
import { extractFunction, readApp } from "./extract.mjs";

const html = readApp();
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const hold = extractFunction(html, "fairwayShouldHoldUpdate");

function shouldHold(state, extras) {
  const extra = extras || {};
  const isRoundInProgress = extra.isRoundInProgress || function () { return false; };
  const activeBackupNeedsRecovery = extra.activeBackupNeedsRecovery || function () { return false; };
  const hasStoredActiveRound = extra.hasStoredActiveRound || function () { return false; };
  const fn = new Function(
    "state",
    "isRoundInProgress",
    "activeBackupNeedsRecovery",
    "hasStoredActiveRound",
    hold + "\nreturn fairwayShouldHoldUpdate();"
  );
  return fn(state, isRoundInProgress, activeBackupNeedsRecovery, hasStoredActiveRound);
}

assert.strictEqual(shouldHold({ screen: "close" }), true);
assert.strictEqual(shouldHold({ screen: "home", _roundSaved: "r1" }), false);
assert.strictEqual(shouldHold({ screen: "hole", _roundSaved: "r1" }), false);
assert.strictEqual(shouldHold({ screen: "home", _newRoundArmed: true }), true);
assert.strictEqual(shouldHold({ screen: "home", _activeRoundLive: true }), true);
assert.strictEqual(shouldHold({ screen: "home" }, { isRoundInProgress: function () { return true; } }), true);
assert.strictEqual(shouldHold({ screen: "home" }, { activeBackupNeedsRecovery: function () { return true; } }), true);
assert.strictEqual(shouldHold({ screen: "hole" }, { hasStoredActiveRound: function () { return true; } }), true);
assert.strictEqual(shouldHold({ screen: "scorecard" }, { hasStoredActiveRound: function () { return true; } }), true);
assert.strictEqual(shouldHold({ screen: "home" }, { hasStoredActiveRound: function () { return true; } }), false);
assert.strictEqual(shouldHold({ screen: "hole" }, { hasStoredActiveRound: function () { return false; } }), false);

assert.ok(html.includes("function holdUpdate()"));
assert.ok(html.includes('sessionStorage.getItem("fairway.swReload")'));
assert.ok(html.includes("Date.now() - stamp < 10000"));
assert.ok(html.includes('worker.postMessage("SKIP_WAITING")'));
const swBoot = html.slice(html.indexOf('if ("serviceWorker" in navigator)'));
const activateAt = swBoot.indexOf("function activateWaiting");
assert.ok(activateAt > 0);
assert.ok(swBoot.slice(activateAt, activateAt + 180).includes("holdUpdate()"));

const shell = sw.match(/const SHELL = "([^"]+)"/);
assert.ok(shell);
assert.ok(/^fairway-v5-\d+$/.test(shell[1]));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));
assert.ok(sw.includes("fairway/js/persist-boot.js"));

console.log("pwa ok");
