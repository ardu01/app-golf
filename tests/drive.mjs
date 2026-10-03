import assert from "assert";
import { readFileSync } from "fs";
import { readApp, loadFunctions, extractFunction } from "./extract.mjs";

const html = readApp();
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
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
  "validateFairwayBackup",
  "driveHash",
  "driveRoundStamp",
  "driveMergeHoleMap",
  "drivePlayerMergeKey",
  "driveMergeRoundPlayers",
  "driveMergeOneRound",
  "driveMergeRounds",
  "driveResolveRounds",
  "driveActiveFingerprint",
  "driveActiveRoundDirty",
  "drivePickActiveRound",
  "driveBackupHasData",
  "driveBackupHash",
  "driveSyncPlan",
  "driveResolveFile",
  "driveAuthFailure",
  "driveAcceptRemote",
  "driveScheduleSync",
  "driveSyncImmediate",
  "driveResultStamp",
  "driveShouldFlushPending",
  "driveUiState",
  "driveSafeId",
  "driveListedIds",
  "driveRoundClosedDuringRead"
]);

const base = "2026-09-23T21:00:00.000Z";
const localNewer = "2026-09-23T22:00:00.000Z";
const remoteNewer = "2026-09-23T23:00:00.000Z";

function plan(extra) {
  return api.driveSyncPlan(Object.assign({
    online: true,
    remoteCorrupt: false,
    remoteHasData: true,
    localHasData: true,
    localActiveDirty: false,
    activeDiffers: false
  }, extra));
}

const up = plan({
  localUpdatedAt: localNewer,
  remoteUpdatedAt: base,
  lastSyncUpdatedAt: base
});
assert.strictEqual(up.action, "upload");
assert.strictEqual(up.keepLocalActive, true);

const down = plan({
  localUpdatedAt: base,
  remoteUpdatedAt: remoteNewer,
  lastSyncUpdatedAt: base
});
assert.strictEqual(down.action, "download");
assert.strictEqual(down.keepLocalActive, false);

const same = plan({
  localUpdatedAt: localNewer,
  remoteUpdatedAt: localNewer,
  lastSyncUpdatedAt: base
});
assert.strictEqual(same.action, "noop");

const offline = plan({ online: false, localUpdatedAt: localNewer, remoteUpdatedAt: base });
assert.strictEqual(offline.action, "offline");
assert.strictEqual(offline.keepLocalActive, true);
assert.strictEqual(api.driveShouldFlushPending({ pending: true, connected: true, online: false }), false);
assert.strictEqual(api.driveShouldFlushPending({ pending: true, connected: true, online: true }), true);
assert.strictEqual(api.driveUiState({ connected: true, online: false, pending: true }).label, "Sin conexión");
assert.strictEqual(api.driveUiState({ connected: true, online: true, pending: true }).label, "Cambios pendientes");

const corrupt = api.driveAcceptRemote("{");
assert.strictEqual(corrupt.ok, false);
const corruptPlan = plan({ remoteCorrupt: true, localUpdatedAt: localNewer, remoteUpdatedAt: remoteNewer });
assert.strictEqual(corruptPlan.action, "reject-remote");
assert.strictEqual(corruptPlan.keepLocalActive, true);

const hostile = api.driveAcceptRemote({
  version: 3,
  updatedAt: remoteNewer,
  rounds: [{
    id: "r-ok",
    club: "<img src=x onerror=alert(1)>",
    players: [{ id: "p1", name: "<script>alert(1)</script>", hcp: 10, scores: { 1: 4, 2: 99, 3: "x" } }],
    me: { gross: "<b>80</b>", name: "<i>Ana</i>" }
  }]
});
assert.strictEqual(hostile.ok, true);
assert.ok(!hostile.data.rounds[0].club.includes("<"));
assert.ok(!hostile.data.rounds[0].players[0].name.includes("<"));
assert.ok(!hostile.data.rounds[0].me.name.includes("<"));
assert.strictEqual(hostile.data.rounds[0].me.gross, null);
assert.strictEqual(hostile.data.rounds[0].players[0].scores["2"], 30);
assert.strictEqual(hostile.data.rounds[0].players[0].scores["3"], undefined);

const auth = api.driveAuthFailure(401);
assert.strictEqual(auth.reconnect, true);
assert.strictEqual(auth.wipeLocal, false);
assert.strictEqual(api.driveAuthFailure(403).wipeLocal, false);
assert.strictEqual(api.driveAuthFailure(500).reconnect, false);
assert.ok(html.includes("needsReconnect: true"));
assert.ok(!html.includes("localStorage.clear"));
assert.ok(!html.includes("client_secret"));
assert.ok(html.includes("https://www.googleapis.com/auth/drive.file"));
assert.ok(html.includes('const FAIRWAY_DRIVE_CLIENT_ID = "429682128465-06rq4tc60pmo6r0808a8b27itcp9v9dv.apps.googleusercontent.com"'));

function mockFind(storedId, byId, listed) {
  const row = storedId ? byId[storedId] : null;
  const storedOk = !!(row && row.status !== 404 && !row.trashed);
  const storedTrashed = !!(row && row.trashed);
  const foundIds = storedOk && !storedTrashed ? [] : api.driveListedIds({ files: listed });
  return api.driveResolveFile({ storedId: storedId, storedOk: storedOk, storedTrashed: storedTrashed, foundIds: foundIds });
}

const known = mockFind("knownFileId1", { knownFileId1: { status: 200 } }, [{ id: "otherFileId9" }]);
assert.strictEqual(known.action, "reuse");
assert.strictEqual(known.fileId, "knownFileId1");

const lost = mockFind("missingFile1", { missingFile1: { status: 404 } }, [
  { id: "fairwayFile1", name: "fairway-data.json", modifiedTime: remoteNewer },
  { id: "fairwayFile2", name: "fairway-data.json", modifiedTime: base }
]);
assert.strictEqual(lost.action, "search-hit");
assert.strictEqual(lost.fileId, "fairwayFile1");
assert.deepStrictEqual(lost.duplicates, ["fairwayFile2"]);
assert.notStrictEqual(lost.action, "create");

const none = mockFind("", {}, []);
assert.strictEqual(none.action, "create");
assert.strictEqual(none.fileId, null);
assert.strictEqual(api.driveSafeId("bad id"), "");
assert.strictEqual(api.driveListedIds({ files: [{ id: "ok_file-id1" }, { id: "../x" }, { id: "short" }] }).length, 1);

const localRounds = [
  { id: "r1", dateISO: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z", club: "A" },
  { id: "r2", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z", club: "Local" }
];
const remoteRounds = [
  { id: "r2", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z", club: "Remote" },
  { id: "r3", dateISO: "2026-09-03T10:00:00.000Z", updatedAt: "2026-09-03T10:00:00.000Z", club: "C" }
];
const merged = api.driveMergeRounds(localRounds, remoteRounds);
const ids = merged.map(r => r.id).sort();
assert.deepStrictEqual(ids, ["r1", "r2", "r3"]);
assert.strictEqual(merged.find(r => r.id === "r2").club, "Remote");
assert.strictEqual(merged.find(r => r.id === "r1").club, "A");
assert.strictEqual(merged.find(r => r.id === "r3").club, "C");

const olderEdit = api.driveMergeRounds(
  [{ id: "same", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-22T12:00:00.000Z", club: "Nueva" }],
  [{ id: "same", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z", club: "Vieja" }]
);
assert.strictEqual(olderEdit[0].club, "Nueva");

const holeMerged = api.driveMergeRounds(
  [{
    id: "same",
    dateISO: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    club: "Local",
    players: [{ id: "p1", name: "Ana", scores: { 1: 4, 2: 5 }, putts: { 1: 2 } }]
  }],
  [{
    id: "same",
    dateISO: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    club: "Remote",
    players: [{ id: "p1", name: "Ana", scores: { 1: 6, 3: 4 }, putts: { 3: 2 } }]
  }]
);
assert.strictEqual(holeMerged[0].club, "Remote");
assert.strictEqual(holeMerged[0].players[0].scores[1], 6);
assert.strictEqual(holeMerged[0].players[0].scores[2], 5);
assert.strictEqual(holeMerged[0].players[0].scores[3], 4);
assert.strictEqual(holeMerged[0].players[0].putts[1], 2);
assert.strictEqual(holeMerged[0].players[0].putts[3], 2);

const localNewerHoles = api.driveMergeRounds(
  [{
    id: "same",
    dateISO: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-22T12:00:00.000Z",
    club: "Nueva",
    players: [{ id: "p1", scores: { 1: 4 } }, { id: "local-only", scores: { 4: 3 } }]
  }],
  [{
    id: "same",
    dateISO: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    club: "Vieja",
    players: [{ id: "p1", scores: { 2: 5 } }]
  }]
);
assert.strictEqual(localNewerHoles[0].club, "Nueva");
assert.strictEqual(localNewerHoles[0].players.find(p => p.id === "p1").scores[1], 4);
assert.strictEqual(localNewerHoles[0].players.find(p => p.id === "p1").scores[2], 5);
assert.strictEqual(localNewerHoles[0].players.find(p => p.id === "local-only").scores[4], 3);

const equalStamp = api.driveMergeRounds(
  [{ id: "same", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z", club: "Local", players: [{ id: "p1", scores: { 1: 4 } }] }],
  [{ id: "same", dateISO: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z", club: "Remote", players: [{ id: "p1", scores: { 9: 5 } }] }]
);
assert.strictEqual(equalStamp[0].club, "Remote");
assert.strictEqual(equalStamp[0].players[0].scores[1], 4);
assert.strictEqual(equalStamp[0].players[0].scores[9], 5);

const byDate = api.driveMergeRounds(
  [{ id: "same", dateISO: "2026-09-02T10:00:00.000Z", club: "Local", players: [{ id: "p1", scores: { 1: 4 } }] }],
  [{ id: "same", dateISO: "2026-09-20T10:00:00.000Z", club: "Remote", players: [{ id: "p1", scores: { 2: 6 } }] }]
);
assert.strictEqual(api.driveRoundStamp(byDate[0]), "2026-09-20T10:00:00.000Z");
assert.strictEqual(byDate[0].players[0].scores[1], 4);
assert.strictEqual(byDate[0].players[0].scores[2], 6);

const downloaded = api.driveResolveRounds(
  [
    { id: "same", updatedAt: "2026-09-02T10:00:00.000Z", dateISO: "2026-09-02T10:00:00.000Z", players: [{ id: "p1", scores: { 1: 4 } }] },
    { id: "local-only", updatedAt: "2026-09-01T10:00:00.000Z", dateISO: "2026-09-01T10:00:00.000Z", players: [{ id: "p1", scores: { 7: 3 } }] }
  ],
  [{ id: "same", updatedAt: "2026-09-20T10:00:00.000Z", dateISO: "2026-09-02T10:00:00.000Z", players: [{ id: "p1", scores: { 2: 5 } }] }],
  { action: "download", mergeRounds: false }
);
assert.strictEqual(downloaded.find(r => r.id === "same").players[0].scores[1], 4);
assert.strictEqual(downloaded.find(r => r.id === "same").players[0].scores[2], 5);
assert.strictEqual(downloaded.find(r => r.id === "local-only").players[0].scores[7], 3);
const uploaded = api.driveResolveRounds(
  [{ id: "keep", updatedAt: localNewer, players: [{ id: "p1", scores: { 1: 4 } }] }],
  [{ id: "drop-me", updatedAt: remoteNewer, players: [{ id: "p1", scores: { 1: 9 } }] }],
  { action: "upload", mergeRounds: false }
);
assert.strictEqual(uploaded.length, 1);
assert.strictEqual(uploaded[0].id, "keep");

function memoryStorage(initial) {
  const data = Object.assign({}, initial || {});
  return {
    data,
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; }
  };
}
function loadApply(scope) {
  const code = ["clampHcp", "drivePlayScreen", "driveApplyResolved"].map((name) => extractFunction(html, name)).join("\n");
  const fn = new Function("scope", [
    "var state = scope.state;",
    "var PLAYERS = scope.PLAYERS;",
    "var localStorage = scope.localStorage;",
    "var HOST_KEY = 'fairway.host.v1';",
    "var ACTIVE_KEY = 'fairway.activeRound.v1';",
    "var ROUNDS_MAX = 99999;",
    "var _driveApplying = false;",
    "function saveRounds() {}",
    "function saveRoster() {}",
    "function applyHostName(name) { if (PLAYERS[0]) PLAYERS[0].name = String(name || '').trim(); }",
    "function touchDataUpdated() { return ''; }",
    "function getDataUpdatedAt() { return ''; }",
    "function restoreActiveRound() {}",
    "function isRoundInProgress() { return false; }",
    "function showToast() {}",
    "function localActiveRoundIsProtected() { return !!scope.protectedRound; }",
    code,
    "return { driveApplyResolved: driveApplyResolved };"
  ].join("\n"));
  return fn(scope);
}
function hostScope(extra) {
  const localCard = JSON.stringify({ hole: 4, players: [{ id: "me", scores: { 1: 5 } }] });
  const scope = Object.assign({
    state: { screen: "perfil" },
    protectedRound: false,
    PLAYERS: [{ name: "Miguel", hcp: 12, ph: 12, ch: 12 }],
    localStorage: memoryStorage({
      "fairway.host.v1": JSON.stringify({ name: "Miguel", hcp: 12 }),
      "fairway.activeRound.v1": localCard
    })
  }, extra || {});
  scope.api = loadApply(scope);
  return scope;
}
function applyRemoteHost(scope) {
  scope.api.driveApplyResolved(null, remoteNewer, {
    host: { name: "Remoto", hcp: 20 },
    active: { hole: 9, players: [{ id: "me", scores: { 1: 3 } }] },
    writeActive: true
  });
}
{
  const blocked = hostScope({ protectedRound: true, state: { screen: "perfil" } });
  applyRemoteHost(blocked);
  assert.strictEqual(JSON.parse(blocked.localStorage.getItem("fairway.host.v1")).name, "Miguel");
  assert.strictEqual(JSON.parse(blocked.localStorage.getItem("fairway.host.v1")).hcp, 12);
  assert.strictEqual(blocked.PLAYERS[0].hcp, 12);
  assert.strictEqual(blocked.PLAYERS[0].name, "Miguel");
  assert.strictEqual(JSON.parse(blocked.localStorage.getItem("fairway.activeRound.v1")).hole, 4);
}
{
  const playing = hostScope({ protectedRound: false, state: { screen: "hole" } });
  applyRemoteHost(playing);
  assert.strictEqual(JSON.parse(playing.localStorage.getItem("fairway.host.v1")).hcp, 12);
  assert.strictEqual(playing.PLAYERS[0].hcp, 12);
  assert.strictEqual(playing.PLAYERS[0].ph, 12);
  assert.strictEqual(playing.PLAYERS[0].ch, 12);
  assert.strictEqual(JSON.parse(playing.localStorage.getItem("fairway.activeRound.v1")).hole, 4);
}
{
  const open = hostScope({ protectedRound: false, state: { screen: "perfil" } });
  applyRemoteHost(open);
  assert.strictEqual(JSON.parse(open.localStorage.getItem("fairway.host.v1")).name, "Remoto");
  assert.strictEqual(open.PLAYERS[0].hcp, 20);
  assert.strictEqual(open.PLAYERS[0].ph, 20);
  assert.strictEqual(open.PLAYERS[0].ch, 20);
  assert.strictEqual(JSON.parse(open.localStorage.getItem("fairway.activeRound.v1")).hole, 9);
}
assert.ok(html.includes("version: 3"));
assert.ok(html.includes('appVersion: "5.0.1"'));

const dirty = {
  hole: 4,
  players: [{ id: "me", scores: { 1: 5, 2: 4 }, putts: { 1: 2 }, fir: { 1: "hit" }, gir: { 1: "yes" }, ball: "Pro V1" }]
};
const other = { hole: 1, players: [{ id: "me", scores: { 1: 3 } }] };
assert.strictEqual(api.driveActiveRoundDirty(dirty), true);
assert.strictEqual(api.drivePickActiveRound(dirty, other, true), dirty);
const protect = plan({
  localUpdatedAt: base,
  remoteUpdatedAt: remoteNewer,
  lastSyncUpdatedAt: base,
  localActiveDirty: true,
  activeDiffers: true
});
assert.strictEqual(protect.action, "merge");
assert.strictEqual(protect.keepLocalActive, true);
assert.notStrictEqual(protect.action, "download");

const conflict = plan({
  localUpdatedAt: localNewer,
  remoteUpdatedAt: remoteNewer,
  lastSyncUpdatedAt: base,
  localActiveDirty: true,
  activeDiffers: true
});
assert.strictEqual(conflict.action, "conflict");
assert.strictEqual(conflict.keepLocalActive, true);
assert.strictEqual(api.driveUiState({ connected: true, conflict: true, online: true }).label, "Conflicto");

assert.strictEqual(api.driveSyncImmediate("round-close"), true);
const closeFires = api.driveScheduleSync([
  { t: 0 },
  { t: 1000 },
  { t: 2000, immediate: true }
], 4000);
assert.deepStrictEqual(closeFires, [2000]);

const burst = api.driveScheduleSync([{ t: 0 }, { t: 400 }, { t: 900 }, { t: 1200 }], 4000);
assert.deepStrictEqual(burst, [5200]);
assert.strictEqual(burst.length, 1);

assert.strictEqual(api.driveResultStamp(base, remoteNewer, "download"), remoteNewer);
const mergedStamp = api.driveResultStamp("2000-01-01T00:00:00.000Z", "2000-01-02T00:00:00.000Z", "merge");
assert.ok(mergedStamp > "2000-01-02T00:00:00.000Z");
assert.strictEqual(api.driveResultStamp(localNewer, base, "upload"), localNewer);

assert.strictEqual(api.driveUiState({ connected: false }).label, "No conectado");
assert.strictEqual(api.driveUiState({ configured: false, connected: false }).label, "Sin configurar");
assert.strictEqual(api.driveUiState({ configured: false, connected: false, conflict: true }).label, "Conflicto");
assert.strictEqual(api.driveUiState({ connected: false, status: "connecting" }).label, "Conectando…");
assert.strictEqual(api.driveUiState({ connected: true, status: "syncing", online: true }).label, "Sincronizando…");
assert.strictEqual(api.driveUiState({ connected: true, online: true }).label, "Sincronizado");
assert.strictEqual(api.driveUiState({ connected: true, needsReconnect: true, online: true }).label, "Necesita reconexión");

assert.ok(html.includes("Conectar Google Drive"));
assert.ok(html.includes("Sincronizar ahora"));
assert.ok(html.includes("Desconectar Google Drive"));
assert.ok(html.includes("Usar este dispositivo"));
assert.ok(html.includes("Usar Google Drive"));
assert.ok(html.includes("no se sustituye hasta que elijas"));
assert.ok(html.includes('const FAIRWAY_DRIVE_CLIENT_ID = "429682128465-06rq4tc60pmo6r0808a8b27itcp9v9dv.apps.googleusercontent.com";'));
assert.ok(html.includes("Fairway guarda tus datos en tu propio Google Drive."));
assert.ok(html.includes("function importFairwayBackup("));
assert.ok(html.includes("function shareFairwayBackup("));
assert.ok(html.includes("DRIVE_DEBOUNCE_MS = 4000"));
assert.ok(html.includes('method: safeFile ? "PATCH" : "POST"'));
assert.ok(!html.includes("driveClientIdInput"));

assert.ok(sw.includes('const SHELL = "fairway-v5-501"'));
assert.ok(sw.includes("accounts.google.com"));
assert.ok(sw.includes(".googleapis.com"));
assert.ok(sw.includes("fairway-maps-v1"));
assert.ok(sw.includes("MAPS_MAX = 120"));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));

assert.strictEqual(api.driveRoundClosedDuringRead(
  { rounds: [{ id: "a" }], activeRound: { players: [{ id: "me" }] } },
  { rounds: [{ id: "done" }, { id: "a" }], activeRound: null }
), true);
assert.strictEqual(api.driveRoundClosedDuringRead(
  { rounds: [{ id: "a" }], activeRound: null },
  { rounds: [{ id: "a" }], activeRound: null }
), false);
const reconcile = extractFunction(html, "driveReconcile");
const readAt = reconcile.indexOf("await driveReadFile");
assert.ok(readAt > 0);
assert.ok(reconcile.indexOf("collectFairwayBackup", readAt) > readAt);
assert.ok(reconcile.includes("driveRoundClosedDuringRead"));
assert.ok(reconcile.includes("if (closedDuringRead) local = localAfterRead"));
assert.ok(reconcile.includes("!closedDuringRead && !driveActiveRoundDirty"));
assert.ok(reconcile.includes("shouldUpload = closedDuringRead"));

console.log("drive ok");
