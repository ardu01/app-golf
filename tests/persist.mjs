import assert from "assert";
import { readFileSync } from "fs";
import { readApp, extractFunction } from "./extract.mjs";
import { bindRoundsScope } from "../fairway/js/rounds.js";

const html = readApp();
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const roundsSrc = readFileSync(new URL("../fairway/js/rounds.js", import.meta.url), "utf8");

for (const block of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  new Function(block[1]);
}

assert.ok(html.includes('appVersion: "5.0.5"'));
assert.ok(!html.includes('appVersion: "4.0.0-alpha"'));
assert.ok(!html.includes('appVersion: "3.0.3"'));
assert.ok(!html.includes('appVersion: "3.0.2"'));
assert.ok(!html.includes('appVersion: "3.0.0"'));
assert.ok(sw.includes('const SHELL = "fairway-v5-505"'));
assert.ok(!sw.includes("fairway-v4-400a"));
assert.ok(roundsSrc.includes("pagehide"));
assert.ok(roundsSrc.includes("visibilitychange"));
assert.ok(roundsSrc.includes('document.addEventListener("freeze"'));
assert.ok(roundsSrc.includes("beforeunload"));
assert.ok(html.includes('src="fairway/js/rounds-boot.js"'));
assert.ok(!/function\s+persistActiveRound\s*\(/.test(html));
assert.ok(!/function\s+loadRounds\s*\(/.test(html));
assert.ok(!/function\s+reopenRound\s*\(/.test(html));
assert.ok(html.includes("data-recover-backup"));
assert.ok(html.includes("Recuperar copia local"));
assert.ok(html.includes("flushActiveRoundForLifecycle"));
assert.ok(html.includes("fairway.swReload"));

const setupNext = extractFunction(html, "setupNext");
assert.ok(!setupNext.includes("clearActiveRound"));
assert.ok(setupNext.includes("roundWouldBeReplaced"));
assert.ok(setupNext.includes("persistActiveRound"));
const setupStart = extractFunction(html, "setupStart");
assert.ok(setupStart.indexOf("persistActiveRound") < setupStart.indexOf("_newRoundArmed = true"));

function load(scope) {
  return bindRoundsScope({
    get state() { return scope.state; },
    get PLAYERS() { return scope.PLAYERS; },
    get HOLES() { return scope.HOLES || []; },
    set HOLES(v) { scope.HOLES = v; },
    get FX() { return scope.FX || { tee: "Amarillas" }; },
    get CLUB() { return "Fairway"; },
    set CLUB(v) {},
    get COURSES() { return []; },
    get localStorage() { return scope.localStorage; },
    showToast(msg) { scope.toasts.push(msg); },
    touchDataUpdated() { scope.touches.n++; return ""; },
    queueDriveSync() {},
    getSelectedCourse() { return null; },
    refreshPlayerHandicaps() {},
    updateClubCalls() {},
    updateHomeThru() {},
    holesForTee() { return []; }
  });
}

function memoryStorage(mode) {
  const data = {};
  return {
    data,
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) {
      if (mode === "throw") {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      if (mode === "drop") return;
      data[k] = String(v);
    },
    removeItem(k) { delete data[k]; }
  };
}

function fresh() {
  const localStorage = memoryStorage();
  const scope = {
    state: {
      hole: 4,
      activePlayer: 0,
      dataTier: "score",
      scNine: "out",
      scCard: "gross",
      editingRoundId: null,
      screen: "hole",
      _newRoundArmed: false,
      _roundSaved: null,
      _activeRoundLive: true,
      setup: { courseId: "la-herreria", tee: "Amarillas", holes: 18, players: [true], modalities: [] }
    },
    PLAYERS: [{
      id: "me", name: "Miguel", short: "Mig", initials: "MI",
      hcp: 12, ch: 12, ph: 12, guest: false, ball: "", withdrawn: false,
      scores: { 1: 5 }, putts: { 1: 2 }, fir: {}, gir: {},
      totalsGross: null, totalsPutts: null, creativePts: 0, creativeLog: []
    }],
    localStorage,
    toasts: [],
    touches: { n: 0 }
  };
  scope.api = load(scope);
  return scope;
}

const ACTIVE_KEY = "fairway.activeRound.v1";
const ACTIVE_BAK_KEY = "fairway.activeRound.bak.v1";

{
  const s = fresh();
  assert.strictEqual(s.api.persistActiveRound(), true);
  const saved = s.api.inspectActiveKey(ACTIVE_KEY);
  assert.strictEqual(saved.status, "ok");
  assert.strictEqual(saved.data.hole, 4);
  assert.strictEqual(saved.data.players[0].scores["1"], 5);
  assert.strictEqual(s.toasts.length, 0);
  assert.strictEqual(s.state._activeRoundLive, true);
}

{
  const s = fresh();
  s.api.persistActiveRound();
  s.PLAYERS[0].scores[2] = 4;
  assert.strictEqual(s.api.persistActiveRound(), true);
  const written = s.localStorage.getItem(ACTIVE_KEY);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_BAK_KEY), written);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).data.players[0].scores["2"], 4);
  s.localStorage.removeItem(ACTIVE_KEY);
  s.PLAYERS[0].scores = {};
  assert.strictEqual(s.api.restoreActiveRound(), true);
  assert.strictEqual(s.PLAYERS[0].scores["2"], 4);
}

{
  // One save must create the .bak. If the primary then disappears, that 4 comes back.
  const s = fresh();
  s.PLAYERS[0].scores = { 1: 4 };
  assert.strictEqual(s.api.persistActiveRound(), true);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_BAK_KEY).data.players[0].scores["1"], 4);
  s.localStorage.removeItem(ACTIVE_KEY);
  s.PLAYERS[0].scores = {};
  assert.strictEqual(s.api.restoreActiveRound(), true);
  assert.strictEqual(s.PLAYERS[0].scores["1"], 4);
}

{
  // A card that drops a stroke must not replace the .bak.
  const s = fresh();
  s.PLAYERS[0].scores = { 1: 4, 2: 5 };
  assert.strictEqual(s.api.persistActiveRound(), true);
  const kept = s.localStorage.getItem(ACTIVE_BAK_KEY);
  assert.strictEqual(JSON.parse(kept).players[0].scores["2"], 5);
  delete s.PLAYERS[0].scores[2];
  assert.strictEqual(s.api.persistActiveRound(), true);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_BAK_KEY), kept);
  assert.strictEqual(JSON.parse(s.localStorage.getItem(ACTIVE_KEY)).players[0].scores["1"], 4);
  assert.ok(!Object.prototype.hasOwnProperty.call(JSON.parse(s.localStorage.getItem(ACTIVE_KEY)).players[0].scores, "2"));
}

{
  const s = fresh();
  s.localStorage.setItem(ACTIVE_KEY, JSON.stringify({ hole: 2, players: [{ id: "me", name: "Miguel", scores: { 1: 3 } }] }));
  s.state._newRoundArmed = true;
  assert.strictEqual(s.api.persistActiveRound(), false);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).data.hole, 2);
}

{
  const s = fresh();
  s.state._roundSaved = "r-1";
  assert.strictEqual(s.api.persistActiveRound(), false);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_KEY), null);
}

{
  const good = JSON.stringify({
    hole: 8,
    players: [{ id: "me", name: "Miguel", scores: { 1: 4 }, putts: {} }],
    setup: { courseId: "missing-course", tee: "Amarillas", players: [true] }
  });
  const s = fresh();
  s.localStorage.setItem(ACTIVE_KEY, "{bad");
  s.localStorage.setItem(ACTIVE_BAK_KEY, good);
  s.PLAYERS[0].scores = { 3: 6 };
  assert.strictEqual(s.api.persistActiveRound(), true);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_BAK_KEY), good);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).data.players[0].scores["3"], 6);
}

{
  const good = JSON.stringify({
    hole: 8,
    activePlayer: 0,
    players: [{ id: "me", name: "Miguel", scores: { 1: 4 } }],
    setup: { courseId: "missing-course", tee: "Amarillas", players: [true] },
    setupPlayers: [true]
  });
  const s = fresh();
  s.PLAYERS.length = 0;
  s.PLAYERS.push({ id: "x", name: "X", scores: {}, putts: {}, fir: {}, gir: {} });
  s.localStorage.setItem(ACTIVE_KEY, "{bad");
  s.localStorage.setItem(ACTIVE_BAK_KEY, good);
  assert.strictEqual(s.api.activeBackupNeedsRecovery(), true);
  assert.strictEqual(s.api.restoreActiveRound(), true);
  assert.strictEqual(s.state.hole, 8);
  assert.strictEqual(s.PLAYERS[0].name, "Miguel");
  assert.strictEqual(s.PLAYERS[0].scores["1"], 4);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).status, "ok");
  assert.ok(s.toasts.some(t => t.indexOf("copia local") !== -1));
  assert.strictEqual(s.api.activeBackupNeedsRecovery(), false);
  assert.strictEqual(s.api.isRoundInProgress(), true);
}

{
  const good = JSON.stringify({
    hole: 6,
    players: [{ id: "me", name: "Miguel", scores: {} }],
    setup: { players: [true] },
    setupPlayers: [true]
  });
  const s = fresh();
  s.PLAYERS[0].scores = {};
  s.PLAYERS[0].putts = {};
  s.localStorage.removeItem(ACTIVE_KEY);
  s.localStorage.setItem(ACTIVE_BAK_KEY, good);
  assert.strictEqual(s.api.recoverActiveRoundFromBackup(), true);
  assert.strictEqual(s.state.hole, 6);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).status, "ok");
  assert.strictEqual(s.api.isRoundInProgress(), true);
}

{
  const s = fresh();
  s.PLAYERS[0].scores = {};
  s.PLAYERS[0].putts = {};
  s.localStorage.setItem(ACTIVE_KEY, JSON.stringify({
    hole: 2,
    players: [{ id: "me", name: "Miguel", scores: {} }]
  }));
  assert.strictEqual(s.api.isRoundInProgress(), true);
  s.state._roundSaved = "r-closed";
  assert.strictEqual(s.api.isRoundInProgress(), false);
  assert.strictEqual(s.api.roundWouldBeReplaced(), false);
}

{
  const s = fresh();
  s.localStorage.setItem(ACTIVE_KEY, "{bad");
  assert.strictEqual(s.api.localActiveRoundIsProtected(), true);
  s.state._activeRoundLive = false;
  s.state.screen = "home";
  s.PLAYERS[0].scores = {};
  s.PLAYERS[0].putts = {};
  assert.strictEqual(s.api.localActiveRoundIsProtected(), true);
}

{
  const s = fresh();
  s.localStorage = memoryStorage("throw");
  s.api = load(s);
  assert.strictEqual(s.api.persistActiveRound(), false);
  assert.ok(s.toasts.some(t => t.indexOf("No se pudo guardar") !== -1));
}

{
  const s = fresh();
  s.localStorage = memoryStorage("drop");
  s.api = load(s);
  assert.strictEqual(s.api.persistActiveRound(), false);
  assert.ok(s.toasts.some(t => t.indexOf("No se pudo guardar") !== -1));
}

{
  const s = fresh();
  s.state._activeRoundLive = false;
  s.state.screen = "home";
  assert.strictEqual(s.api.flushActiveRoundForLifecycle(), undefined);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_KEY), null);
  s.state._activeRoundLive = true;
  s.api.flushActiveRoundForLifecycle();
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).status, "ok");
  s.state._newRoundArmed = true;
  s.localStorage.removeItem(ACTIVE_KEY);
  s.api.flushActiveRoundForLifecycle();
  assert.strictEqual(s.localStorage.getItem(ACTIVE_KEY), null);
}

const confirmClose = extractFunction(html, "confirmCloseLiveRound");
const finishEarly = extractFunction(html, "finishRoundEarly");
assert.strictEqual((confirmClose.match(/window\.confirm\(/g) || []).length, 2);
assert.ok(confirmClose.includes("Se va a cerrar la ronda en curso."));
assert.ok(confirmClose.includes("¿Seguro? No se puede deshacer fácilmente."));
assert.ok(finishEarly.indexOf("confirmCloseLiveRound()") < finishEarly.indexOf('go("close")'));
assert.ok(html.includes('onclick="finishRoundEarly()"'));
assert.strictEqual((html.match(/onclick="finishRoundEarly\(\)"/g) || []).length, 2);

function runFinishEarly(answers, inProgress) {
  const calls = [];
  const queue = answers.slice();
  const fn = new Function("scope", [
    "var window = scope.window;",
    "function isRoundInProgress() { return scope.inProgress; }",
    "function showToast(msg) { scope.calls.push(['toast', msg]); }",
    "function go(name) { scope.calls.push(['go', name]); }",
    confirmClose,
    finishEarly,
    "finishRoundEarly();"
  ].join("\n"));
  fn({
    inProgress,
    calls,
    window: {
      confirm(msg) {
        calls.push(["confirm", msg]);
        return queue.length ? queue.shift() : false;
      }
    }
  });
  return calls;
}

{
  const idle = runFinishEarly([true, true], false);
  assert.deepStrictEqual(idle, [["toast", "No hay ronda en curso"]]);
  const cancelFirst = runFinishEarly([false, true], true);
  assert.deepStrictEqual(cancelFirst.map(c => c[0]), ["confirm"]);
  assert.ok(cancelFirst[0][1].indexOf("Se va a cerrar la ronda") === 0);
  const cancelSecond = runFinishEarly([true, false], true);
  assert.deepStrictEqual(cancelSecond.map(c => c[0]), ["confirm", "confirm"]);
  assert.ok(cancelSecond[1][1].indexOf("¿Seguro?") === 0);
  const closed = runFinishEarly([true, true], true);
  assert.deepStrictEqual(closed.map(c => c[0]), ["confirm", "confirm", "go"]);
  assert.strictEqual(closed[2][1], "close");
}

function loadClose(scope) {
  if (!scope.state.setup) {
    scope.state.setup = { courseId: "x", tee: "Amarillas", holes: 18, modalities: [], players: [true] };
  }
  return bindRoundsScope({
    get state() { return scope.state; },
    get PLAYERS() { return scope.PLAYERS; },
    get HOLES() { return scope.HOLES || []; },
    set HOLES(v) { scope.HOLES = v; },
    get FX() { return scope.FX || { tee: "Amarillas" }; },
    get CLUB() { return "Fairway"; },
    set CLUB(v) {},
    get COURSES() { return []; },
    get localStorage() { return scope.localStorage; },
    showToast(msg) { scope.toasts.push(msg); },
    touchDataUpdated() { scope.touches.n++; return ""; },
    queueDriveSync() {},
    getSelectedCourse() { return null; },
    refreshPlayerHandicaps() {},
    updateClubCalls() {},
    updateHomeThru() {},
    liveStandings() { return { rows: [{ thru: 1, me: true, name: "Miguel", p: { id: "me" }, gross: 5, net: 4, toPar: 1, sf: 2, ch: 12 }], mods: [] }; },
    creativeEnabled() { return false; },
    countMarkedHoles() { return 1; },
    roundLayoutLabel() { return "18 hoyos"; },
    holesForTee() { return []; }
  });
}

function closeStorage(blockRounds) {
  const data = {};
  return {
    data,
    blockRounds: !!blockRounds,
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) {
      if (this.blockRounds && k === "fairway.rounds.v1") {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      data[k] = String(v);
    },
    removeItem(k) { delete data[k]; }
  };
}

{
  const storage = closeStorage(true);
  storage.setItem("fairway.activeRound.v1", JSON.stringify({ hole: 4, players: [{ id: "me", scores: { 1: 5 } }] }));
  storage.setItem("fairway.activeRound.bak.v1", JSON.stringify({ hole: 3, players: [{ id: "me", scores: { 1: 4 } }] }));
  const scope = {
    state: { _roundSaved: null, _activeRoundLive: true, editingRoundId: null, hole: 4, activePlayer: 0 },
    PLAYERS: [{ id: "me", scores: { 1: 5 }, putts: {}, fir: {}, gir: {}, totalsGross: null }],
    localStorage: storage,
    toasts: [],
    touches: { n: 0 }
  };
  scope.api = loadClose(scope);
  assert.strictEqual(scope.api.persistCompletedRound(), null);
  assert.strictEqual(scope.state._roundSaved, null);
  assert.ok(storage.getItem("fairway.activeRound.v1"));
  assert.ok(storage.getItem("fairway.activeRound.bak.v1"));
  assert.strictEqual(scope.PLAYERS[0].scores[1], 5);
  storage.blockRounds = false;
  const savedId = scope.api.persistCompletedRound();
  assert.ok(savedId);
  assert.strictEqual(scope.state._roundSaved, savedId);
  assert.strictEqual(storage.getItem("fairway.activeRound.v1"), null);
  assert.strictEqual(storage.getItem("fairway.activeRound.bak.v1"), null);
  const history = JSON.parse(storage.getItem("fairway.rounds.v1"));
  assert.strictEqual(history[0].id, savedId);
}

{
  const storage = closeStorage(false);
  storage.setItem("fairway.rounds.v1", "{bad");
  storage.setItem("fairway.activeRound.v1", JSON.stringify({ hole: 4, players: [{ id: "me", scores: { 1: 5 } }] }));
  storage.setItem("fairway.activeRound.bak.v1", JSON.stringify({ hole: 2, players: [{ id: "me", scores: { 1: 3 } }] }));
  const scope = {
    state: { _roundSaved: null, _activeRoundLive: true, editingRoundId: null, hole: 4, activePlayer: 0 },
    PLAYERS: [{ id: "me", scores: { 1: 5 }, putts: {}, fir: {}, gir: {}, totalsGross: null }],
    localStorage: storage,
    toasts: [],
    touches: { n: 0 }
  };
  scope.api = loadClose(scope);
  assert.strictEqual(scope.api.persistCompletedRound(), null);
  assert.strictEqual(scope.state._roundSaved, null);
  assert.ok(storage.getItem("fairway.activeRound.v1"));
  assert.ok(storage.getItem("fairway.activeRound.bak.v1"));
  assert.strictEqual(storage.getItem("fairway.rounds.v1"), "{bad");
}

{
  // A missing history key must come back from the .bak. A valid empty list must not.
  const storage = closeStorage(false);
  const oldCard = {
    id: "r-old",
    players: [{ id: "me", name: "Miguel", scores: { 1: 4, 2: 5 } }]
  };
  storage.setItem("fairway.rounds.bak.v1", JSON.stringify([oldCard]));
  const scope = {
    state: { _roundSaved: null, _activeRoundLive: true, editingRoundId: null, hole: 4, activePlayer: 0 },
    PLAYERS: [{ id: "me", name: "Miguel", scores: { 1: 5 }, putts: {}, fir: {}, gir: {}, totalsGross: null }],
    localStorage: storage,
    toasts: [],
    touches: { n: 0 }
  };
  scope.api = loadClose(scope);
  assert.strictEqual(scope.api.loadRounds()[0].id, "r-old");
  assert.strictEqual(scope.api.loadRounds()[0].players[0].scores["2"], 5);
  const savedId = scope.api.persistCompletedRound();
  assert.ok(savedId);
  const history = JSON.parse(storage.getItem("fairway.rounds.v1"));
  assert.ok(history.some(r => r.id === "r-old"));
  assert.ok(history.some(r => r.id === savedId));
  assert.strictEqual(history.find(r => r.id === "r-old").players[0].scores["1"], 4);
  assert.strictEqual(history.find(r => r.id === "r-old").players[0].scores["2"], 5);

  const empty = closeStorage(false);
  empty.setItem("fairway.rounds.v1", "[]");
  empty.setItem("fairway.rounds.bak.v1", JSON.stringify([oldCard]));
  const emptyScope = {
    state: { _roundSaved: null, _activeRoundLive: false, editingRoundId: null, hole: 1, activePlayer: 0 },
    PLAYERS: [{ id: "me", scores: {}, putts: {}, fir: {}, gir: {} }],
    localStorage: empty,
    toasts: [],
    touches: { n: 0 }
  };
  emptyScope.api = loadClose(emptyScope);
  assert.deepStrictEqual(emptyScope.api.loadRounds(), []);
  assert.strictEqual(empty.getItem("fairway.rounds.v1"), "[]");
}

{
  // An unreadable primary must not replace a good history .bak.
  const s = fresh();
  const good = JSON.stringify([{ id: "r-old", players: [{ id: "me", scores: { 1: 4, 2: 5 } }] }]);
  s.localStorage.setItem("fairway.rounds.v1", "{bad");
  s.localStorage.setItem("fairway.rounds.bak.v1", good);
  assert.strictEqual(s.api.saveRounds([{ id: "r-new", players: [{ id: "me", scores: { 3: 6 } }] }]), true);
  assert.strictEqual(s.localStorage.getItem("fairway.rounds.bak.v1"), good);
  assert.strictEqual(JSON.parse(s.localStorage.getItem("fairway.rounds.v1"))[0].players[0].scores["3"], 6);
}

{
  // A closed round must stay in the history .bak. If the primary key then
  // disappears, loadRounds still returns that round, not only the previous list.
  const s = fresh();
  const older = [{ id: "r-old", players: [{ id: "me", name: "Miguel", scores: { 1: 4 } }] }];
  const closed = [
    { id: "r-new", players: [{ id: "me", name: "Miguel", scores: { 1: 5, 2: 4 } }] },
    older[0]
  ];
  assert.strictEqual(s.api.saveRounds(older), true);
  assert.strictEqual(s.api.saveRounds(closed), true);
  const bak = JSON.parse(s.localStorage.getItem("fairway.rounds.bak.v1"));
  assert.ok(bak.some((r) => r.id === "r-new"));
  assert.strictEqual(bak.find((r) => r.id === "r-new").players[0].scores["2"], 4);
  assert.ok(bak.some((r) => r.id === "r-old"));
  s.localStorage.removeItem("fairway.rounds.v1");
  const recovered = s.api.loadRounds();
  assert.ok(recovered.some((r) => r.id === "r-new"));
  assert.strictEqual(recovered.find((r) => r.id === "r-new").players[0].scores["1"], 5);
  assert.strictEqual(recovered.find((r) => r.id === "r-old").players[0].scores["1"], 4);

  // Dropping an id must not erase that round from the .bak.
  assert.strictEqual(s.api.saveRounds([older[0]]), true);
  const afterDrop = JSON.parse(s.localStorage.getItem("fairway.rounds.bak.v1"));
  assert.ok(afterDrop.some((r) => r.id === "r-new"));
}

console.log("persist ok");
