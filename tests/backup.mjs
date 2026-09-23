import assert from "assert";
import { readApp, loadFunctions } from "./extract.mjs";

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

assert.strictEqual(api.clampHcp("12,4"), 12.4);
assert.strictEqual(api.clampHcp(-2), -2);
assert.strictEqual(api.clampHcp(-40), -10);
assert.strictEqual(api.clampHcp(80), 54);

const evilId = "');alert(1);//";
const checked = api.validateFairwayBackup({
  version: 3,
  rounds: [{
    id: evilId,
    club: "<img src=x onerror=alert(1)>",
    me: { gross: "<img src=x>", toPar: "2", sf: "no", thru: 18, name: "<b>x</b>" },
    players: [{
      id: "p1",
      name: "Ana <script>",
      hcp: 12.4,
      scores: { 1: 4, 2: "x", 99: 8, 3: 5 },
      putts: { 1: 2 },
      fir: { 1: "hit", 2: "javascript:alert(1)" },
      gir: { 1: "yes" }
    }],
    creative: { rulesText: "<script>alert(1)</script>", actions: [{ id: "a'1", trigger: "gir_yes", label: "<b>GIR</b>", pts: 1 }] },
    standings: [{ gross: "alert(1)", sf: 36 }]
  }],
  roster: [{ id: "p1", name: "Ana" }]
});
assert.strictEqual(checked.ok, true);
const round = checked.data.rounds[0];
assert.ok(round.id.length > 0);
assert.ok(!round.club.includes("<"));
assert.strictEqual(round.me.gross, null);
assert.strictEqual(round.me.toPar, 2);
assert.strictEqual(round.me.sf, null);
assert.strictEqual(round.me.thru, 18);
assert.ok(!round.me.name.includes("<"));
assert.strictEqual(round.players[0].scores["1"], 4);
assert.strictEqual(round.players[0].scores["3"], 5);
assert.strictEqual(round.players[0].scores["2"], undefined);
assert.strictEqual(round.players[0].scores["99"], undefined);
assert.deepStrictEqual(round.players[0].fir, { 1: "hit" });
assert.ok(!round.creative.rulesText.includes("<"));
assert.strictEqual(round.creative.actions[0].label, "bGIR/b");
assert.ok(!round.creative.actions[0].id.includes("'"));
assert.strictEqual(round.standings[0].gross, null);
assert.strictEqual(round.standings[0].sf, 36);

assert.strictEqual(api.validateFairwayBackup({ rounds: "no" }).ok, false);
assert.strictEqual(api.validateFairwayBackup(null).ok, false);
const many = api.validateFairwayBackup({ rounds: Array.from({ length: 201 }, (_, i) => ({ id: "r" + i })) });
assert.strictEqual(many.ok, false);

const newer = api.validateFairwayBackup({ version: 4, rounds: [{ id: "r1", players: [] }] });
assert.strictEqual(newer.ok, true);
assert.strictEqual(newer.data.newer, true);
assert.strictEqual(newer.data.version, 4);

const active = api.validateFairwayBackup({
  version: 3,
  rounds: [],
  activeRound: {
    hole: 7,
    players: [{ id: "p1", name: "Ana", hcp: 10, scores: { 1: 4 } }],
    setup: { courseId: "la-herreria", holes: 18, tee: "Amarillas" }
  }
});
assert.strictEqual(active.data.activeRound.hole, 7);
assert.strictEqual(active.data.activeRound.players[0].scores["1"], 4);

assert.ok(!html.includes("onclick=\"openDetalle('${r.id}')\""));
assert.ok(!html.includes("onclick=\"reopenRound('${d.id}'"));
assert.ok(html.includes("data-open-detalle"));
assert.ok(html.includes("data-round-action"));
assert.ok(html.includes('appVersion: "3.0.0"'));
assert.ok(html.includes("fairwayShouldHoldUpdate"));
assert.ok(html.includes("fairway.rounds.bak.v1"));

console.log("backup ok");
