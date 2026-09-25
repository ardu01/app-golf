import assert from "assert";
import { readFileSync } from "fs";
import { readApp, loadFunctions } from "./extract.mjs";

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
  "driveMergeRounds",
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
  "driveListedIds"
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
assert.ok(html.includes('const FAIRWAY_DRIVE_CLIENT_ID = ""'));

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
assert.strictEqual(api.driveUiState({ connected: false, status: "connecting" }).label, "Conectando…");
assert.strictEqual(api.driveUiState({ connected: true, status: "syncing", online: true }).label, "Sincronizando…");
assert.strictEqual(api.driveUiState({ connected: true, online: true }).label, "Sincronizado");
assert.strictEqual(api.driveUiState({ connected: true, needsReconnect: true, online: true }).label, "Necesita reconexión");

assert.ok(html.includes("Conectar Google Drive"));
assert.ok(html.includes("Sincronizar ahora"));
assert.ok(html.includes("Desconectar Google Drive"));
assert.ok(html.includes("Usar este dispositivo"));
assert.ok(html.includes("Usar Google Drive"));
assert.ok(html.includes("Fairway guarda tus datos en tu propio Google Drive."));
assert.ok(html.includes("function importFairwayBackup("));
assert.ok(html.includes("function shareFairwayBackup("));
assert.ok(html.includes("DRIVE_DEBOUNCE_MS = 4000"));
assert.ok(html.includes('method: safeFile ? "PATCH" : "POST"'));
assert.ok(!html.includes("driveClientIdInput"));

assert.ok(sw.includes('const SHELL = "fairway-v3-195"'));
assert.ok(sw.includes("accounts.google.com"));
assert.ok(sw.includes(".googleapis.com"));
assert.ok(sw.includes("fairway-maps-v1"));
assert.ok(sw.includes("MAPS_MAX = 120"));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));

console.log("drive ok");
