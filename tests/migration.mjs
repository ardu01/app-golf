import assert from "assert";
import { readFileSync } from "fs";
import {
  ACTIVE_BAK_KEY,
  ACTIVE_KEY,
  APP_VERSION,
  BACKUP_SCHEMA,
  CREATIVE_PRESETS_KEY,
  DATA_UPDATED_KEY,
  DRIVE_CLIENT_KEY,
  DRIVE_FILE_KEY,
  DRIVE_FOLDER_KEY,
  DRIVE_META_KEY,
  HOST_KEY,
  MIGRATION_BACKUP_KEY,
  MIGRATION_STATE_KEY,
  MIRRORED_KEYS,
  RETIRED_KEYS,
  ROSTER_KEY,
  ROUNDS_BAK_KEY,
  ROUNDS_KEY
} from "../fairway/js/keys.js";
import {
  attachLocalMirror,
  dropRetiredKeys,
  localActiveWriteAllowed,
  migrateLocalToIdb,
  recoverMissingLocal
} from "../fairway/js/persistence.js";

function memLocal(initial) {
  const data = Object.assign({}, initial || {});
  return {
    data,
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; }
  };
}

function memIdb(opts) {
  const options = opts || {};
  const data = new Map();
  const log = [];
  return {
    log,
    data,
    async get(k) {
      if (!data.has(k)) return undefined;
      return JSON.parse(JSON.stringify(data.get(k)));
    },
    async set(k, v) {
      log.push(["set", k]);
      if (options.quotaOn && options.quotaOn(k, log)) {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      if (options.failOn && options.failOn(k, log)) {
        const err = new Error("write");
        err.name = "WriteError";
        throw err;
      }
      data.set(k, JSON.parse(JSON.stringify(v)));
    },
    async del(k) {
      log.push(["del", k]);
      data.delete(k);
    }
  };
}

function sample() {
  return {
    [ROUNDS_KEY]: JSON.stringify([{ id: "r1", club: "La Herrería", players: [{ id: "p1", name: "Ana", scores: { 1: 4 } }] }]),
    [ROUNDS_BAK_KEY]: JSON.stringify([{ id: "r0", club: "Old" }]),
    [ACTIVE_KEY]: JSON.stringify({ hole: 4, players: [{ id: "p1", name: "Ana", scores: { 1: 4 } }] }),
    [ACTIVE_BAK_KEY]: JSON.stringify({ hole: 3, players: [{ id: "p1", name: "Ana", scores: { 1: 5 } }] }),
    [ROSTER_KEY]: JSON.stringify([{ id: "sv-1", name: "Ana", hcp: 12 }]),
    [HOST_KEY]: JSON.stringify({ name: "Miguel", hcp: 10 }),
    [DATA_UPDATED_KEY]: "2026-09-29T06:00:00.000Z",
    [CREATIVE_PRESETS_KEY]: JSON.stringify([{ name: "Birdies", actions: [] }]),
    [DRIVE_FILE_KEY]: "fairwayFile1",
    [DRIVE_FOLDER_KEY]: "fairwayFolder1",
    [DRIVE_META_KEY]: JSON.stringify({ connected: true, pending: false, access_token: "should-not-land", refresh_token: "nope" })
  };
}

function localsOf(local) {
  const copy = {};
  MIRRORED_KEYS.forEach((k) => { copy[k] = local.getItem(k); });
  return copy;
}

{
  assert.strictEqual(APP_VERSION, "5.1.1");
  assert.strictEqual(BACKUP_SCHEMA, 3);
  assert.ok(MIRRORED_KEYS.indexOf(DRIVE_CLIENT_KEY) < 0);
  assert.ok(MIRRORED_KEYS.indexOf(CREATIVE_PRESETS_KEY) >= 0);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.ok(html.includes('appVersion: "5.1.1"'));
  assert.ok(html.includes("version: 3"));
  const scoring = readFileSync(new URL("../fairway/js/scoring.js", import.meta.url), "utf8");
  assert.ok(scoring.includes("hi * (Number(tee.slope) / 113)"));
  assert.ok(html.includes('src="fairway/js/persist-boot.js"'));
  assert.ok(sw.includes('const SHELL = "fairway-v5-511"'));
  assert.ok(MIRRORED_KEYS.indexOf("fairway.bag.v1") < 0);
  assert.ok(RETIRED_KEYS.indexOf("fairway.bag.v1") >= 0);
  assert.ok(sw.includes("fairway/js/persist-boot.js"));
  assert.ok(sw.includes("fairway/js/persistence.js"));
}

{
  const local = memLocal(sample());
  const before = localsOf(local);
  const idb = memIdb();
  const result = await migrateLocalToIdb(local, idb);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.action, "migrated");
  assert.strictEqual(result.deletedLocal, false);
  assert.strictEqual(result.schema, 3);
  assert.deepStrictEqual(localsOf(local), before);
  const rounds = await idb.get(ROUNDS_KEY);
  assert.strictEqual(rounds[0].id, "r1");
  const active = await idb.get(ACTIVE_KEY);
  assert.strictEqual(active.hole, 4);
  assert.strictEqual(await idb.get(DATA_UPDATED_KEY), "2026-09-29T06:00:00.000Z");
  assert.strictEqual((await idb.get(HOST_KEY)).name, "Miguel");
  assert.strictEqual((await idb.get(CREATIVE_PRESETS_KEY))[0].name, "Birdies");
  const meta = await idb.get(DRIVE_META_KEY);
  assert.strictEqual(meta.connected, true);
  assert.strictEqual(meta.access_token, undefined);
  assert.strictEqual(meta.refresh_token, undefined);
  assert.ok(idb.data.has(MIGRATION_BACKUP_KEY));
  const state = await idb.get(MIGRATION_STATE_KEY);
  assert.strictEqual(state.status, "verified");
  assert.strictEqual(state.schema, 3);
  assert.strictEqual(state.appVersion, "5.1.1");
  assert.strictEqual(state.deletedLocal, false);
  const backupAt = idb.log.findIndex((row) => row[0] === "set" && row[1] === MIGRATION_BACKUP_KEY);
  const firstPayload = idb.log.findIndex((row) => row[0] === "set" && row[1] === ROUNDS_KEY);
  assert.ok(backupAt >= 0 && backupAt < firstPayload);

  const again = await migrateLocalToIdb(local, idb);
  assert.strictEqual(again.action, "noop");
  assert.strictEqual(again.deletedLocal, false);
}

{
  const local = memLocal(sample());
  local.setItem(ROUNDS_KEY, "{bad");
  const idb = memIdb();
  const result = await migrateLocalToIdb(local, idb);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.action, "migrated-partial");
  assert.strictEqual(await idb.get(ROUNDS_KEY), undefined);
  assert.strictEqual((await idb.get(HOST_KEY)).hcp, 10);
  assert.strictEqual(local.getItem(ROUNDS_KEY), "{bad");
  assert.strictEqual(result.skipped[0].key, ROUNDS_KEY);
}

{
  const local = memLocal(sample());
  const idb = memIdb();
  await migrateLocalToIdb(local, idb);
  const good = await idb.get(ROUNDS_KEY);
  local.setItem(ROUNDS_KEY, "{bad");
  const second = await migrateLocalToIdb(local, idb);
  assert.strictEqual(second.action, "migrated-partial");
  assert.deepStrictEqual(await idb.get(ROUNDS_KEY), good);
  assert.strictEqual(local.getItem(ROUNDS_KEY), "{bad");
}

{
  const local = memLocal(sample());
  const idb = memIdb({
    quotaOn(key) { return key === ROUNDS_KEY; }
  });
  const before = localsOf(local);
  const result = await migrateLocalToIdb(local, idb);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.action, "quota");
  assert.strictEqual(result.deletedLocal, false);
  assert.strictEqual((await idb.get(MIGRATION_STATE_KEY)).status, "in_progress");
  assert.deepStrictEqual(localsOf(local), before);
  assert.ok(idb.data.has(MIGRATION_BACKUP_KEY));
}

{
  const local = memLocal(sample());
  const idb = memIdb({
    quotaOn(key) { return key === MIGRATION_BACKUP_KEY; }
  });
  const result = await migrateLocalToIdb(local, idb);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.action, "quota");
  assert.strictEqual(await idb.get(ROUNDS_KEY), undefined);
  assert.strictEqual(local.getItem(ROUNDS_KEY).includes("r1"), true);
}

{
  const local = memLocal(sample());
  const idb = memIdb({
    failOn(key) { return key === HOST_KEY; }
  });
  const result = await migrateLocalToIdb(local, idb);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.action, "write");
  assert.strictEqual(result.status, "in_progress");
  assert.strictEqual(local.getItem(HOST_KEY).includes("Miguel"), true);
}

{
  const local = memLocal(sample());
  const before = localsOf(local);
  const idb = memIdb();
  const stopped = await migrateLocalToIdb(local, idb, { interruptAfterPayloadWrites: 1 });
  assert.strictEqual(stopped.ok, false);
  assert.strictEqual(stopped.action, "interrupted");
  assert.strictEqual(stopped.status, "in_progress");
  assert.strictEqual(stopped.deletedLocal, false);
  assert.deepStrictEqual(localsOf(local), before);
  assert.strictEqual((await idb.get(MIGRATION_STATE_KEY)).status, "in_progress");
  const resumed = await migrateLocalToIdb(local, idb);
  assert.strictEqual(resumed.ok, true);
  assert.strictEqual(resumed.action, "migrated");
  assert.strictEqual((await idb.get(ACTIVE_KEY)).hole, 4);
  assert.deepStrictEqual(localsOf(local), before);
}

{
  const local = memLocal(sample());
  const idb = memIdb();
  await migrateLocalToIdb(local, idb);
  const goodActive = await idb.get(ACTIVE_KEY);
  const goodBak = await idb.get(ACTIVE_BAK_KEY);
  local.removeItem(ACTIVE_KEY);
  local.removeItem(ACTIVE_BAK_KEY);
  const before = localsOf(local);
  const next = await migrateLocalToIdb(local, idb);
  assert.strictEqual(next.ok, true);
  assert.strictEqual(next.deletedLocal, false);
  assert.deepStrictEqual(await idb.get(ACTIVE_KEY), goodActive);
  assert.deepStrictEqual(await idb.get(ACTIVE_BAK_KEY), goodBak);
  assert.strictEqual((await idb.get(ROUNDS_KEY))[0].id, "r1");
  assert.deepStrictEqual(localsOf(local), before);
  assert.strictEqual(local.getItem(ACTIVE_KEY), null);
  assert.ok(!idb.log.some((row) => row[0] === "del" && (row[1] === ACTIVE_KEY || row[1] === ACTIVE_BAK_KEY)));
}

{
  const local = memLocal(sample());
  const idb = memIdb();
  await migrateLocalToIdb(local, idb);
  const goodHost = await idb.get(HOST_KEY);
  local.setItem(HOST_KEY, "");
  const next = await migrateLocalToIdb(local, idb);
  assert.strictEqual(next.ok, true);
  assert.strictEqual(next.deletedLocal, false);
  assert.deepStrictEqual(await idb.get(HOST_KEY), goodHost);
  assert.strictEqual(local.getItem(HOST_KEY), "");
  assert.strictEqual(local.getItem(ROUNDS_KEY).includes("r1"), true);
  const backup = await idb.get(MIGRATION_BACKUP_KEY);
  assert.strictEqual(backup.raw[HOST_KEY], "");
  assert.ok(!idb.log.some((row) => row[0] === "del" && row[1] === HOST_KEY));
}

{
  const local = memLocal(sample());
  const idb = memIdb();
  await migrateLocalToIdb(local, idb);
  MIRRORED_KEYS.forEach((k) => local.removeItem(k));
  const kept = await migrateLocalToIdb(local, idb);
  assert.strictEqual(kept.action, "keep-idb");
  assert.strictEqual((await idb.get(ROUNDS_KEY))[0].id, "r1");
  const recovered = await recoverMissingLocal(local, idb);
  assert.ok(recovered.restoredKeys.indexOf(ROUNDS_KEY) >= 0);
  assert.ok(recovered.restoredKeys.indexOf(ACTIVE_KEY) >= 0);
  assert.strictEqual(JSON.parse(local.getItem(HOST_KEY)).name, "Miguel");
  assert.strictEqual(recovered.overwrittenActive, false);
  const done = await migrateLocalToIdb(local, idb);
  assert.strictEqual(done.ok, true);
  assert.strictEqual((await idb.get(ACTIVE_KEY)).hole, 4);
}

{
  const local = memLocal(sample());
  const idb = memIdb();
  await migrateLocalToIdb(local, idb);
  const other = { hole: 9, players: [{ id: "x", name: "Otra", scores: { 1: 3 } }] };
  await idb.set(ACTIVE_KEY, other);
  const recovered = await recoverMissingLocal(local, idb);
  assert.strictEqual(JSON.parse(local.getItem(ACTIVE_KEY)).hole, 4);
  assert.ok(recovered.restoredKeys.indexOf(ACTIVE_KEY) < 0);
  assert.strictEqual(localActiveWriteAllowed(local.getItem(ACTIVE_KEY)), false);
}

{
  const local = memLocal(sample());
  local.setItem(ACTIVE_KEY, "{bad");
  const idb = memIdb();
  await idb.set(ACTIVE_KEY, { hole: 2, players: [{ id: "p", name: "A", scores: {} }] });
  const recovered = await recoverMissingLocal(local, idb);
  assert.strictEqual(local.getItem(ACTIVE_KEY), "{bad");
  assert.ok(recovered.kept.some((row) => row.key === ACTIVE_KEY && row.reason === "corrupt-local"));
}

{
  const local = memLocal(sample());
  local.removeItem(ACTIVE_KEY);
  const idb = memIdb();
  await idb.set(ACTIVE_KEY, { hole: 8, players: [{ id: "p", name: "A" }] });
  const recovered = await recoverMissingLocal(local, idb);
  assert.ok(recovered.restoredKeys.indexOf(ACTIVE_KEY) < 0);
  assert.strictEqual(local.getItem(ACTIVE_KEY), null);
  assert.ok(local.getItem(ACTIVE_BAK_KEY));
}

{
  const local = memLocal({ [HOST_KEY]: JSON.stringify({ name: "Ana", hcp: 8 }) });
  const idb = memIdb();
  assert.strictEqual(attachLocalMirror(local, idb), true);
  local.setItem(HOST_KEY, JSON.stringify({ name: "Luis", hcp: 9 }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual((await idb.get(HOST_KEY)).name, "Luis");
  local.setItem(DRIVE_CLIENT_KEY, "not-a-token");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(await idb.get(DRIVE_CLIENT_KEY), undefined);
}

{
  const local = memLocal(sample());
  local.setItem("fairway.bag.v1", JSON.stringify([{ name: "Driver", loft: 10.5 }]));
  const before = localsOf(local);
  const idb = memIdb();
  await idb.set("fairway.bag.v1", [{ name: "Driver" }]);
  await idb.set(ACTIVE_KEY, { hole: 4, players: [{ id: "p1", name: "Ana" }] });
  await dropRetiredKeys(local, idb);
  assert.strictEqual(local.getItem("fairway.bag.v1"), null);
  assert.strictEqual(await idb.get("fairway.bag.v1"), undefined);
  assert.strictEqual((await idb.get(ACTIVE_KEY)).hole, 4);
  assert.strictEqual(local.getItem(ACTIVE_KEY), before[ACTIVE_KEY]);
  assert.strictEqual(local.getItem(ROUNDS_KEY), before[ROUNDS_KEY]);
}

console.log("migration ok");
