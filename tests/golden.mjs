import assert from "assert";
import { readApp, extractFunction } from "./extract.mjs";

const html = readApp();

const names = [
  "clampHcp",
  "clipStr",
  "finiteOrNull",
  "sanitizeScoreMap",
  "sanitizeMarkMap",
  "sanitizeMe",
  "sanitizeCreative",
  "sanitizeImportedPlayer",
  "sanitizeImportedRound",
  "validateFairwayBackup",
  "stablefordHole",
  "holesInRound",
  "scaleHandicapForRound",
  "resolveSetupTee",
  "courseHandicapFor",
  "playerCourseHcp",
  "refreshPlayerHandicaps",
  "relativeStrokeIndex",
  "strokesOnHole",
  "countMarkedHoles",
  "playerGross",
  "playerParPlayed",
  "activePlayers",
  "chaosSpin",
  "blankModeScore",
  "applyModeScores",
  "attachModeScores",
  "liveStandings",
  "snapshotPlayers",
  "formatRoundDate",
  "creativeEnabled",
  "roundLayoutLabel",
  "buildRoundRecord",
  "readRoundList",
  "loadRounds",
  "saveRounds",
  "playerHasMarks",
  "inspectActiveRaw",
  "inspectActiveKey",
  "isRoundInProgress",
  "clearActiveRound",
  "endActiveRoundMemory",
  "persistCompletedRound",
  "getRoundById",
  "holesForTee",
  "applyCourseData",
  "guestInitials",
  "reopenRound"
];

function memoryStorage() {
  const data = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; }
  };
}

function par4(n) {
  return Array.from({ length: n }, (_, i) => ({ n: i + 1, par: 4, hcp: i + 1, m: 300 }));
}

function setHoles(list) {
  scope.HOLES.length = 0;
  list.forEach(h => scope.HOLES.push(h));
}

function golfer(scores, extra) {
  return Object.assign({
    id: "me",
    name: "Miguel",
    short: "Mig",
    initials: "MI",
    hcp: 10,
    ch: 11,
    ph: 11,
    guest: false,
    withdrawn: false,
    ball: "",
    scores: Object.assign({}, scores),
    putts: {},
    fir: {},
    gir: {},
    totalsGross: null,
    totalsPutts: null,
    creativePts: 0,
    creativeLog: []
  }, extra || {});
}

function usePlayer(p) {
  scope.PLAYERS.length = 0;
  scope.PLAYERS.push(p);
  scope.state.setup.players = [true];
}

function row() {
  return scope.api.liveStandings().rows[0];
}

function expectCard(got, exp) {
  assert.strictEqual(got.gross, exp.gross);
  assert.strictEqual(got.net, exp.net);
  assert.strictEqual(got.sf, exp.sf);
  assert.strictEqual(got.thru, exp.thru);
}

const scope = {
  state: {
    hole: 1,
    activePlayer: 0,
    screen: "hole",
    editingRoundId: null,
    _roundSaved: null,
    _activeRoundLive: true,
    _newRoundArmed: false,
    setup: {
      courseId: "golden",
      tee: "Amarillas",
      holes: 18,
      players: [true],
      modalities: []
    }
  },
  PLAYERS: [],
  HOLES: par4(18),
  FX: { tee: "Amarillas", par: 72 },
  COURSES: [],
  localStorage: memoryStorage(),
  toasts: []
};

function load(scope) {
  const code = names.map(n => extractFunction(html, n)).join("\n");
  const roundsMax = html.match(/const ROUNDS_MAX = (\d+);/);
  const fn = new Function("scope", [
    "var state = scope.state;",
    "var PLAYERS = scope.PLAYERS;",
    "var HOLES = scope.HOLES;",
    "var FX = scope.FX;",
    "var COURSES = scope.COURSES;",
    "var CLUB = 'Fairway';",
    "var localStorage = scope.localStorage;",
    "var toasts = scope.toasts;",
    "var ACTIVE_KEY = 'fairway.activeRound.v1';",
    "var ACTIVE_BAK_KEY = 'fairway.activeRound.bak.v1';",
    "var ROUNDS_KEY = 'fairway.rounds.v1';",
    "var ROUNDS_BAK_KEY = 'fairway.rounds.bak.v1';",
    "var ROUNDS_MAX = " + (roundsMax ? roundsMax[1] : "99999") + ";",
    "var _roundsUnreadable = false;",
    "var document = { getElementById: function () { return null; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };",
    "function getSelectedCourse() { return COURSES.find(function (c) { return c.id === state.setup.courseId; }) || COURSES[0]; }",
    "function showToast(msg) { toasts.push(msg); }",
    "function touchDataUpdated() { return ''; }",
    "function queueDriveSync() {}",
    "function updateHomeThru() {}",
    "function updateClubCalls() {}",
    "function persistActiveRound() { return true; }",
    "function go() {}",
    code,
    "return { " + names.join(",") + " };"
  ].join("\n"));
  return fn(scope);
}

scope.api = load(scope);
const api = scope.api;

const tee71 = {
  id: "tee71",
  par: 71,
  holes: par4(18),
  tees: [{ name: "Amarillas", slope: 113, cr: 71.5, par: 71 }]
};
const tee72 = {
  id: "tee72",
  par: 72,
  holes: par4(18),
  tees: [{ name: "Amarillas", slope: 113, cr: 72, par: 72 }]
};
const nineCourse = {
  id: "nine",
  par: 36,
  holes: par4(9),
  tees: [{ name: "Amarillas", slope: 113, cr: 71.5, par: 71 }]
};

assert.strictEqual(api.courseHandicapFor({ hcp: 10 }, { course: tee71, tee: "Amarillas", holes: 18 }), 11);
assert.strictEqual(api.courseHandicapFor({ hcp: -1.5 }, { course: tee72, tee: "Amarillas", holes: 18 }), -1);
assert.strictEqual(api.courseHandicapFor({ hcp: 10 }, { course: nineCourse, tee: "Amarillas", holes: 9 }), 11);

const all18 = {};
for (let i = 1; i <= 18; i++) all18[i] = 4;
setHoles(par4(18));
scope.state.setup.holes = 18;
usePlayer(golfer(all18, { ch: 11, ph: 11 }));
expectCard(row(), { gross: 72, net: 61, sf: 47, thru: 18 });

const all9 = {};
for (let i = 1; i <= 9; i++) all9[i] = 4;
setHoles(par4(9));
scope.state.setup.holes = 9;
usePlayer(golfer(all9, { ch: 6, ph: 6 }));
expectCard(row(), { gross: 36, net: 30, sf: 24, thru: 9 });

setHoles(par4(18));
scope.state.setup.holes = 18;
usePlayer(golfer({ 1: 4, 2: 5, 4: 3 }, { ch: 11, ph: 11 }));
expectCard(row(), { gross: 12, net: 9, sf: 9, thru: 4 });

usePlayer(golfer({}, { ch: 11, ph: 11, totalsGross: 90 }));
expectCard(row(), { gross: 90, net: 79, sf: 0, thru: 18 });

const rated = {
  id: "golden",
  name: "Golden",
  par: 71,
  official: false,
  layout: "18 hoyos",
  tees: [{ name: "Amarillas", slope: 113, cr: 71.5, par: 71 }],
  holes: par4(18)
};
scope.COURSES.length = 0;
scope.COURSES.push(rated);
scope.state.setup.courseId = "golden";
scope.state.setup.tee = "Amarillas";
scope.state.setup.holes = 9;
scope.state._roundSaved = null;
scope.state.editingRoundId = null;
setHoles(par4(18));
usePlayer(golfer(all9, { hcp: 10, ch: null, ph: null }));
api.refreshPlayerHandicaps();
assert.strictEqual(scope.PLAYERS[0].ch, 6);
assert.strictEqual(scope.PLAYERS[0].ph, 6);
const before = row();
expectCard(before, { gross: 36, net: 30, sf: 24, thru: 9 });

const savedId = api.persistCompletedRound();
assert.ok(savedId);
const stored = JSON.parse(scope.localStorage.getItem("fairway.rounds.v1"));
const checked = api.validateFairwayBackup({
  version: 3,
  app: "Fairway",
  appVersion: "4.2.6",
  rounds: stored,
  roster: [],
  host: null
});
assert.strictEqual(checked.ok, true);
assert.strictEqual(checked.data.version, 3);
assert.strictEqual(checked.data.rounds[0].holes, 9);
scope.localStorage.setItem("fairway.rounds.v1", JSON.stringify(checked.data.rounds));

scope.state.setup.holes = 18;
assert.strictEqual(api.reopenRound(savedId), true);
assert.strictEqual(scope.state.setup.holes, 9);
const reopenSrc = extractFunction(html, "reopenRound");
const holesAt = reopenSrc.indexOf("holes: d.holes");
const refreshAt = reopenSrc.indexOf("refreshPlayerHandicaps");
assert.ok(holesAt > 0 && holesAt < refreshAt);
assert.strictEqual(scope.PLAYERS[0].ch, 6);
assert.strictEqual(scope.PLAYERS[0].ph, 6);
expectCard(row(), { gross: before.gross, net: before.net, sf: before.sf, thru: before.thru });

console.log("golden ok");
