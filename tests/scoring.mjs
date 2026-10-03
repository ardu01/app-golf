import assert from "assert";
import { readFileSync } from "fs";
import { bindScoringScope } from "../fairway/js/scoring.js";
import { APP_VERSION } from "../fairway/js/keys.js";

const state = { setup: { holes: 18, tee: "Amarillas", players: [true, true] } };
const FX = { tee: "Amarillas" };
const holes18 = Array.from({ length: 18 }, (_, i) => ({
  n: i + 1,
  par: 4,
  hcp: i + 1
}));
const scope = {
  state,
  FX,
  HOLES: holes18,
  PLAYERS: [],
  getSelectedCourse: () => null
};
const api = bindScoringScope(scope);

const course = {
  id: "test",
  par: 72,
  holes: holes18,
  tees: [{ name: "Amarillas", slope: 125, cr: 71.5, par: 72 }]
};

function ch(hi, opts) {
  return api.courseHandicapFor({ hcp: hi }, Object.assign({ course, tee: "Amarillas", holes: 18 }, opts));
}

// HI 10, slope 125, CR 71.5, par 72 → round(10 * 125/113 + (71.5-72)) = round(10.5619) = 11
assert.strictEqual(ch(10), 11);
assert.strictEqual(ch(0), 0);
assert.strictEqual(ch(-2, { course: { par: 72, holes: holes18, tees: [{ name: "Amarillas", slope: 113, cr: 72, par: 72 }] } }), -2);

// 9 hoyos de un campo de 18: round(CH18 / 2)
assert.strictEqual(api.scaleHandicapForRound(11, 9, 18), 6);
assert.strictEqual(ch(10, { holes: 9 }), 6);
assert.strictEqual(api.scaleHandicapForRound(11, 18, 18), 11);

// Sin CR/slope se redondea el HI y se escala
assert.strictEqual(api.courseHandicapFor({ hcp: 10.4 }, { course: { par: 72, holes: holes18, tees: [{ name: "Amarillas" }] }, holes: 18 }), 10);

// CH 0 y hándicap plus no se pierden por un || 
assert.strictEqual(api.playerCourseHcp({ ch: 0, ph: 12, hcp: 12 }), 0);
assert.strictEqual(api.playerCourseHcp({ ch: -2, ph: -2 }), -2);
assert.strictEqual(api.playerCourseHcp({ hcp: 15.2 }), 15);

// Reparto: CH 10 recibe en los SI 1–10. CH 20 recibe 2 en SI 1–2.
assert.strictEqual(api.strokesOnHole(10, 1, { holes: 18, holeList: holes18 }), 1);
assert.strictEqual(api.strokesOnHole(10, 10, { holes: 18, holeList: holes18 }), 1);
assert.strictEqual(api.strokesOnHole(10, 11, { holes: 18, holeList: holes18 }), 0);
assert.strictEqual(api.strokesOnHole(20, 1, { holes: 18, holeList: holes18 }), 2);
assert.strictEqual(api.strokesOnHole(20, 2, { holes: 18, holeList: holes18 }), 2);
assert.strictEqual(api.strokesOnHole(20, 3, { holes: 18, holeList: holes18 }), 1);
assert.strictEqual(api.strokesOnHole(0, 1, { holes: 18, holeList: holes18 }), 0);

// Plus: CH −2 entrega golpe en los dos hoyos más fáciles (SI 18 y 17)
assert.strictEqual(api.strokesOnHole(-2, 18, { holes: 18, holeList: holes18 }), -1);
assert.strictEqual(api.strokesOnHole(-2, 17, { holes: 18, holeList: holes18 }), -1);
assert.strictEqual(api.strokesOnHole(-2, 16, { holes: 18, holeList: holes18 }), 0);

// 9 hoyos: el índice es relativo a esos nueve, no el SI de la tarjeta de 18
const nine = [
  { n: 1, par: 4, hcp: 10 },
  { n: 2, par: 4, hcp: 3 },
  { n: 3, par: 3, hcp: 15 },
  { n: 4, par: 5, hcp: 1 },
  { n: 5, par: 4, hcp: 12 },
  { n: 6, par: 4, hcp: 7 },
  { n: 7, par: 3, hcp: 8 },
  { n: 8, par: 4, hcp: 14 },
  { n: 9, par: 4, hcp: 5 }
];
const card18 = nine.concat(Array.from({ length: 9 }, (_, i) => ({ n: 10 + i, par: 4, hcp: 20 + i })));
assert.strictEqual(api.relativeStrokeIndex(1, 9, card18), 1);
assert.strictEqual(api.relativeStrokeIndex(3, 9, card18), 2);
assert.strictEqual(api.relativeStrokeIndex(15, 9, card18), 9);
state.setup.holes = 9;
assert.strictEqual(api.strokesOnHole(5, 1, { holes: 9, holeList: card18 }), 1);
assert.strictEqual(api.strokesOnHole(5, 15, { holes: 9, holeList: card18 }), 0);
assert.strictEqual(api.relativeStrokeIndex(3, 9, nine), 3);
state.setup.holes = 18;

// Stableford neto: score − par − golpes recibidos
assert.strictEqual(api.stablefordHole(4, 4, 1), 3);
assert.strictEqual(api.stablefordHole(4, 4, 0), 2);
assert.strictEqual(api.stablefordHole(5, 4, 0), 1);
assert.strictEqual(api.stablefordHole(6, 4, 0), 0);
assert.strictEqual(api.stablefordHole(2, 4, 0), 4);
assert.strictEqual(api.stablefordHole(1, 4, 0), 5);
assert.strictEqual(api.stablefordHole(3, 4, -1), 2);

// Hoyos sin anotar no suman
function grossOf(scores) {
  let gross = 0, thru = 0, putts = 0, puttN = 0;
  for (let i = 1; i <= 18; i++) {
    if (scores[i] == null) continue;
    gross += scores[i];
    thru++;
    if (scores.putts && scores.putts[i] != null) { putts += scores.putts[i]; puttN++; }
  }
  return { gross, thru, putts, puttN };
}
const partial = { 1: 4, 2: 5, 4: 3, putts: { 1: 2, 2: 1 } };
const g = grossOf(partial);
assert.strictEqual(g.gross, 12);
assert.strictEqual(g.thru, 3);
assert.strictEqual(g.putts, 3);
assert.strictEqual(g.puttN, 2);

// Retirado no entra en la lista activa
scope.PLAYERS.push(
  { id: "a", name: "Ana", withdrawn: false },
  { id: "b", name: "Bea", withdrawn: true }
);
state.setup.players = [true, true];
assert.deepStrictEqual(api.activePlayers().map(p => p.id), ["a"]);

// Empate de neto: los dos quedan; el nombre no desempata el empate
const tieA = { name: "Ana", thru: 18, net: 72, gross: 80 };
const tieB = { name: "Bea", thru: 18, net: 72, gross: 80 };
assert.strictEqual(api.modeTie("stroke", tieA, tieB), true);
assert.ok(api.modeRankCmp("stroke")(tieA, tieB) !== 0);
const better = { name: "Ana", thru: 18, net: 70, gross: 80 };
assert.strictEqual(api.modeTie("stroke", better, tieB), false);
assert.ok(api.modeRankCmp("stableford")(
  { name: "Ana", thru: 9, sf: 20, gross: 40 },
  { name: "Bea", thru: 9, sf: 18, gross: 41 }
) < 0);

assert.strictEqual(api.plaqueIsHerreria({ courseId: "la-herreria" }), true);
assert.strictEqual(api.plaqueIsHerreria({ club: "La Herrería" }), true);
assert.strictEqual(api.plaqueIsHerreria({ courseId: "las-rozas", club: "Las Rozas" }), false);
assert.strictEqual(api.plaqueIsHerreria({ club: "CD Militar La Dehesa" }), false);

// gross / net / sf / thru. pickWinner no los calcula: elige una fila.
// liveStandings usa playerCourseHcp, que se queda con ch y no reescala el slope.
// HI 10, slope 125, CR 71.5, par 72 → CH 11. En 9 hoyos ese CH escala a 6.
function card(id, name, ch, scores) {
  return {
    id, name, initials: name.slice(0, 1), withdrawn: false,
    ch, ph: ch, scores, putts: {}
  };
}
function rowOf(player, holes) {
  scope.PLAYERS.length = 0;
  scope.PLAYERS.push(player);
  state.setup.players = [true];
  state.setup.holes = holes;
  state.setup.modalities = [];
  const { rows } = api.liveStandings();
  if (rows.length !== 1) throw new Error("se esperaba una sola fila");
  return rows[0];
}

const allPar18 = {};
for (let i = 1; i <= 18; i++) allPar18[i] = 4;
const r18 = rowOf(card("ana", "Ana", 11, allPar18), 18);
assert.strictEqual(r18.gross, 72);
assert.strictEqual(r18.net, 61);
assert.strictEqual(r18.sf, 47);
assert.strictEqual(r18.thru, 18);
assert.strictEqual(r18.strokesUsed, 11);
assert.strictEqual(api.pickWinner([r18], "net", true), r18);

const allPar9 = {};
for (let i = 1; i <= 9; i++) allPar9[i] = 4;
const r9 = rowOf(card("ana", "Ana", 6, allPar9), 9);
assert.strictEqual(r9.gross, 36);
assert.strictEqual(r9.net, 30);
assert.strictEqual(r9.sf, 24);
assert.strictEqual(r9.thru, 9);

const rPart = rowOf(card("ana", "Ana", 11, { 1: 4, 2: 5, 4: 3 }), 18);
assert.strictEqual(rPart.gross, 12);
assert.strictEqual(rPart.net, 9);
assert.strictEqual(rPart.sf, 9);
assert.strictEqual(rPart.thru, 4);

const totalsPlayer = card("ana", "Ana", 11, {});
totalsPlayer.totalsGross = 90;
const totals = rowOf(totalsPlayer, 18);
assert.strictEqual(totals.gross, 90);
assert.strictEqual(totals.net, 79);
assert.strictEqual(totals.sf, 0);
assert.strictEqual(totals.thru, 18);
assert.strictEqual(totals.strokesUsed, 11);

// HI 10, slope 113, CR 71.5, tee par 71 → raw 10.5 → 11.
// HI -1.5, slope 113, CR 72, par 72 → raw -1.5 → -1.
// A course that is already 9 holes does not halve CH.
assert.strictEqual(api.courseHandicapFor({ hcp: 10 }, {
  course: { par: 71, holes: holes18, tees: [{ name: "Amarillas", slope: 113, cr: 71.5, par: 71 }] },
  tee: "Amarillas",
  holes: 18
}), 11);
assert.strictEqual(api.courseHandicapFor({ hcp: -1.5 }, {
  course: { par: 72, holes: holes18, tees: [{ name: "Amarillas", slope: 113, cr: 72, par: 72 }] },
  tee: "Amarillas",
  holes: 18
}), -1);
assert.strictEqual(api.courseHandicapFor({ hcp: 10 }, {
  course: { par: 36, holes: holes18.slice(0, 9), tees: [{ name: "Amarillas", slope: 113, cr: 71.5, par: 71 }] },
  tee: "Amarillas",
  holes: 9
}), 11);

// Replacing the hole list is visible. The page assigns HOLES when the tee changes.
scope.HOLES = [{ n: 1, par: 5, hcp: 1 }, { n: 2, par: 3, hcp: 2 }];
assert.strictEqual(api.playerParPlayed({ scores: { 1: 4 } }, 2), 5);
scope.HOLES = holes18;

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.strictEqual(APP_VERSION, "5.0.3");
assert.ok(html.includes('appVersion: "5.0.3"'));
assert.ok(html.includes("function go(name)"));
assert.ok(html.includes("function setScore(idx, v)"));
assert.ok(html.includes('src="fairway/js/scoring-boot.js"'));
assert.ok(!/function\s+liveStandings\s*\(/.test(html));
assert.ok(!/function\s+courseHandicapFor\s*\(/.test(html));
assert.ok(!/function\s+stablefordHole\s*\(/.test(html));

console.log("scoring ok");
