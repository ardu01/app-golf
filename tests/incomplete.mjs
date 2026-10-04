import assert from "assert";
import { readFileSync } from "fs";
import { extractFunction, readApp } from "./extract.mjs";
import { bindScoringScope, stablefordHole } from "../fairway/js/scoring.js";

const html = readApp();
const names = [
  "netDoubleBogeyScore",
  "completeRoundGross",
  "roundHasMarkedHoleScores",
  "closedCardCountsForStats",
  "needsCompleteRoundGross",
  "statsNum",
  "statsRoundTime",
  "statsGrossByLayout",
  "savedRoundsForStats"
];
const api = new Function(
  names.map(n => extractFunction(html, n)).join("\n") +
  "\nreturn { netDoubleBogeyScore, completeRoundGross, closedCardCountsForStats, needsCompleteRoundGross, statsGrossByLayout, savedRoundsForStats };"
)();

function saved(rounds) {
  const fn = new Function(
    "loadRounds",
    "state",
    names.map(n => extractFunction(html, n)).join("\n") + "\nreturn savedRoundsForStats();"
  );
  return fn(() => rounds, { deletedRounds: {} });
}

// Net double bogey is the first gross that scores 0 Stableford, including a negative stroke.
assert.strictEqual(api.netDoubleBogeyScore(4, 1), 7);
assert.strictEqual(api.netDoubleBogeyScore(4, 0), 6);
assert.strictEqual(api.netDoubleBogeyScore(4, -1), 5);
assert.strictEqual(api.netDoubleBogeyScore(3, -1), 4);
assert.strictEqual(stablefordHole(7, 4, 1), 0);
assert.strictEqual(stablefordHole(6, 4, 1), 1);
assert.strictEqual(stablefordHole(5, 4, -1), 0);
assert.strictEqual(stablefordHole(4, 4, -1), 1);

{
  const scores = { 1: 5, 4: 6 };
  const before = JSON.stringify(scores);
  const holes = [
    { n: 1, par: 4, hcp: 1 },
    { n: 2, par: 3, hcp: 18 },
    { n: 3, par: 5, hcp: 10 },
    { n: 4, par: 4, hcp: 2 }
  ];
  const recv = { 1: 1, 2: -1, 3: 0, 4: 2 };
  const filled = api.completeRoundGross(holes, scores, h => recv[h.n]);
  assert.strictEqual(filled.gross, 5 + (3 + 2 - 1) + (5 + 2 + 0) + 6);
  assert.strictEqual(filled.filled, true);
  assert.strictEqual(filled.marked, 2);
  assert.strictEqual(JSON.stringify(scores), before);
  assert.strictEqual(scores[2], undefined);
  assert.strictEqual(scores[3], undefined);
}

{
  const scores = { 1: 4, 2: 5 };
  const filled = api.completeRoundGross(
    [{ n: 1, par: 4 }, { n: 2, par: 4 }],
    scores,
    () => 0
  );
  assert.strictEqual(filled.filled, false);
  assert.strictEqual(filled.gross, 9);
  assert.deepStrictEqual(scores, { 1: 4, 2: 5 });
}

function card(holes, played, extra) {
  return Object.assign({
    holes: holes,
    holesPlayed: played,
    me: { gross: 80, thru: played }
  }, extra);
}

assert.strictEqual(api.closedCardCountsForStats(card(18, 18)), true);
assert.strictEqual(api.closedCardCountsForStats(card(18, 17)), false);
assert.strictEqual(api.closedCardCountsForStats(card(18, 10)), false);
assert.strictEqual(api.closedCardCountsForStats(card(18, 9)), false);
assert.strictEqual(api.closedCardCountsForStats(card(18, 1)), false);
assert.strictEqual(api.closedCardCountsForStats(card(9, 9)), true);
assert.strictEqual(api.closedCardCountsForStats(card(9, 8)), false);
assert.strictEqual(api.closedCardCountsForStats(card(9, 5)), false);
assert.strictEqual(api.closedCardCountsForStats({ holes: 18, me: { gross: 80, thru: 14 } }), true);
assert.strictEqual(api.closedCardCountsForStats({
  holes: 18,
  holesPlayed: 0,
  players: [{ scores: {} }],
  me: { gross: 90, thru: 18 }
}), true);
assert.strictEqual(api.closedCardCountsForStats({
  holes: 18,
  holesPlayed: 0,
  players: [{ scores: { 1: 4 } }],
  me: { gross: 4, thru: 1 }
}), false);

assert.strictEqual(api.needsCompleteRoundGross(18, 17, false), true);
assert.strictEqual(api.needsCompleteRoundGross(18, 9, false), true);
assert.strictEqual(api.needsCompleteRoundGross(18, 18, false), false);
assert.strictEqual(api.needsCompleteRoundGross(9, 8, false), true);
assert.strictEqual(api.needsCompleteRoundGross(9, 9, false), false);
assert.strictEqual(api.needsCompleteRoundGross(18, 0, false), false);
assert.strictEqual(api.needsCompleteRoundGross(18, 10, true), false);
assert.strictEqual(api.needsCompleteRoundGross(12, 6, false), false);

{
  const by = api.statsGrossByLayout([
    { holes: 18, holesPlayed: 18, me: { gross: 80 } },
    { holes: 18, holesPlayed: 9, me: { gross: 45 } },
    { holes: 18, holesPlayed: 17, me: { gross: 78 } },
    { holes: 9, holesPlayed: 9, me: { gross: 40 } },
    { holes: 9, holesPlayed: 8, me: { gross: 36 } },
    { holes: 18, me: { gross: 70 } }
  ]);
  assert.deepStrictEqual(by[18], [80, 70]);
  assert.deepStrictEqual(by[9], [40]);
}

{
  const rounds = [
    { id: "full", holes: 18, holesPlayed: 18, me: { gross: 80, thru: 18 }, dateISO: "2026-10-01T00:00:00.000Z" },
    { id: "loose9", holes: 18, holesPlayed: 9, me: { gross: 99, thru: 9 }, dateISO: "2026-10-02T00:00:00.000Z" },
    { id: "short", holes: 18, holesPlayed: 14, me: { gross: 70, thru: 14 }, dateISO: "2026-10-03T00:00:00.000Z" },
    { id: "nine", holes: 9, holesPlayed: 9, me: { gross: 40, thru: 9 }, dateISO: "2026-10-04T00:00:00.000Z" },
    { id: "nineShort", holes: 9, holesPlayed: 6, me: { gross: 30, thru: 6 }, dateISO: "2026-09-01T00:00:00.000Z" },
    { id: "old", holes: 18, me: { gross: 72, thru: 18 }, dateISO: "2026-08-01T00:00:00.000Z" },
    { id: "totals", holes: 18, holesPlayed: 0, players: [{ scores: {} }], me: { gross: 90, thru: 18 }, dateISO: "2026-07-01T00:00:00.000Z" }
  ];
  const ids = saved(rounds).map(r => r.id);
  assert.deepStrictEqual(ids, ["nine", "full", "old", "totals"]);
}

const close = extractFunction(html, "renderClose");
assert.ok(close.indexOf("filledRoundGross") > 0);
assert.ok(close.indexOf("countMarkedHoles") < close.indexOf("persistCompletedRound"));
assert.ok(close.indexOf("filledRoundGross") < close.indexOf("persistCompletedRound"));
assert.ok(close.includes("is-gray-total"));
assert.ok(!/scores\s*\[[^\]]+\]\s*=/.test(close));

const roundsSrc = readFileSync(new URL("../fairway/js/rounds.js", import.meta.url), "utf8");
assert.ok(!roundsSrc.includes("netDoubleBogey"));
assert.ok(!roundsSrc.includes("completeRoundGross"));
assert.ok(roundsSrc.includes("Backup schema stays 3"));

const scoring = readFileSync(new URL("../fairway/js/scoring.js", import.meta.url), "utf8");
assert.ok(scoring.includes("function courseHandicapFor"));
assert.ok(scoring.includes("function strokesOnHole"));
assert.ok(scoring.includes("function stablefordHole"));
assert.ok(!scoring.includes("netDoubleBogey"));

const css = readFileSync(new URL("../fairway/css/fairway.css", import.meta.url), "utf8");
assert.ok(css.includes(".is-gray-total"));
assert.ok(!/\.is-gray-total[^{]*\{[^}]*padding/.test(css));
assert.ok(!/\.is-gray-total[^{]*\{[^}]*border/.test(css));

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(sw.includes('const SHELL = "fairway-v5-511"'));
const installPart = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
assert.ok(installPart.length > 0 && !installPart.includes("skipWaiting"));

const filledSrc = extractFunction(html, "filledRoundGross");
assert.ok(filledSrc.includes("strokesOnHole(playerCourseHcp(player), h.hcp)"));
assert.ok(!filledSrc.includes("holeList"));

// 9-hole round on an 18-hole card. Live scoring calls strokesOnHole(ph, hcp)
// with the full HOLES list. Gray must use that same allocation.
{
  const front = [4, 10, 18, 6, 2, 12, 14, 8, 16];
  const holes18 = front.map((hcp, i) => ({ n: i + 1, par: 4, hcp: hcp })).concat(
    Array.from({ length: 9 }, (_, i) => ({ n: 10 + i, par: 4, hcp: 20 + i }))
  );
  const state = { setup: { holes: 9, tee: "Amarillas", players: [true] } };
  const scoring = bindScoringScope({
    state: state,
    HOLES: holes18,
    PLAYERS: [],
    FX: { tee: "Amarillas" },
    getSelectedCourse: () => null
  });
  const filledRoundGross = new Function(
    "HOLES",
    "strokesOnHole",
    "playerCourseHcp",
    extractFunction(html, "netDoubleBogeyScore") + "\n" +
    extractFunction(html, "completeRoundGross") + "\n" +
    extractFunction(html, "filledRoundGross") + "\n" +
    "return filledRoundGross;"
  )(holes18, scoring.strokesOnHole, scoring.playerCourseHcp);

  function liveRecv(ph, hcp) {
    return scoring.strokesOnHole(ph, hcp);
  }
  function assertGrayMatchesLive(ph, expectRecv) {
    const nine = holes18.slice(0, 9);
    nine.forEach(h => {
      assert.strictEqual(liveRecv(ph, h.hcp), expectRecv[h.hcp], "PH " + ph + " SI " + h.hcp);
    });
    const player = { ch: ph, scores: {} };
    const filled = filledRoundGross(player, 9);
    const expected = nine.reduce((sum, h) => sum + h.par + 2 + liveRecv(ph, h.hcp), 0);
    assert.strictEqual(filled.gross, expected);
    assert.strictEqual(filled.filled, true);
    assert.deepStrictEqual(player.scores, {});
    nine.forEach((h, i) => {
      const scores = {};
      nine.forEach((other, j) => { if (j !== i) scores[other.n] = other.par; });
      const one = filledRoundGross({ ch: ph, scores: scores }, 9);
      const marked = nine.reduce((sum, other, j) => sum + (j === i ? 0 : other.par), 0);
      assert.strictEqual(one.gross - marked, h.par + 2 + liveRecv(ph, h.hcp));
    });
  }
  // PH 6: the six hardest of these nine, not absolute SI 1–6.
  assertGrayMatchesLive(6, { 2: 1, 4: 1, 6: 1, 8: 1, 10: 1, 12: 1, 14: 0, 16: 0, 18: 0 });
  // PH −2: the two easiest of these nine, not the two easiest absolute SI on 18.
  assertGrayMatchesLive(-2, { 2: 0, 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 14: 0, 16: -1, 18: -1 });
}

console.log("incomplete ok");
