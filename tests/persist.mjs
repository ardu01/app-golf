import assert from "assert";
import { readFileSync } from "fs";
import { readApp, extractFunction } from "./extract.mjs";

const html = readApp();
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

for (const block of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  new Function(block[1]);
}

assert.ok(html.includes('appVersion: "4.1.1"'));
assert.ok(!html.includes('appVersion: "4.0.0-alpha"'));
assert.ok(!html.includes('appVersion: "3.0.3"'));
assert.ok(!html.includes('appVersion: "3.0.2"'));
assert.ok(!html.includes('appVersion: "3.0.0"'));
assert.ok(sw.includes('const SHELL = "fairway-v4-411"'));
assert.ok(!sw.includes("fairway-v4-400a"));
assert.ok(html.includes("pagehide"));
assert.ok(html.includes("visibilitychange"));
assert.ok(html.includes('document.addEventListener("freeze"'));
assert.ok(html.includes("beforeunload"));
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

const names = [
  "playerHasMarks",
  "inspectActiveRaw",
  "inspectActiveKey",
  "noteActiveStorageError",
  "flushActiveStorageError",
  "storageSetItem",
  "activeBackupNeedsRecovery",
  "roundWouldBeReplaced",
  "localActiveRoundIsProtected",
  "snapshotPlayers",
  "persistActiveRound",
  "applyActivePayload",
  "restoreActiveRound",
  "recoverActiveRoundFromBackup",
  "isRoundInProgress",
  "hasStoredActiveRound",
  "flushActiveRoundForLifecycle"
];

function load(scope) {
  const code = names.map(n => extractFunction(html, n)).join("\n");
  const fn = new Function("scope", [
    "var state = scope.state;",
    "var PLAYERS = scope.PLAYERS;",
    "var localStorage = scope.localStorage;",
    "var toasts = scope.toasts;",
    "var touches = scope.touches;",
    "var ACTIVE_KEY = 'fairway.activeRound.v1';",
    "var ACTIVE_BAK_KEY = 'fairway.activeRound.bak.v1';",
    "var _activeStorageError = '';",
    "var CLUB = 'Fairway';",
    "var COURSES = [];",
    "var FX = { tee: 'Amarillas' };",
    "var HOLES = [];",
    "function getSelectedCourse() { return null; }",
    "function refreshPlayerHandicaps() {}",
    "function updateClubCalls() {}",
    "function touchDataUpdated() { touches.n++; return ''; }",
    "function queueDriveSync() {}",
    "function showToast(msg) { toasts.push(msg); }",
    "function holesForTee() { return []; }",
    code,
    "return { " + names.join(",") + " };"
  ].join("\n"));
  return fn(scope);
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
  const first = s.localStorage.getItem(ACTIVE_KEY);
  s.PLAYERS[0].scores[2] = 4;
  assert.strictEqual(s.api.persistActiveRound(), true);
  assert.strictEqual(s.localStorage.getItem(ACTIVE_BAK_KEY), first);
  assert.strictEqual(s.api.inspectActiveKey(ACTIVE_KEY).data.players[0].scores["2"], 4);
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

console.log("persist ok");
