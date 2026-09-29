import { ACTIVE_KEY } from "./keys.js";
import { openFairwayDb } from "./idb.js";
import { attachLocalMirror, migrateLocalToIdb, recoverMissingLocal } from "./persistence.js";

async function boot() {
  if (typeof indexedDB === "undefined") return;
  let db;
  try {
    db = await openFairwayDb();
  } catch (e) {
    console.warn("fairway idb", e);
    return;
  }
  const local = window.localStorage;
  let result;
  try {
    result = await migrateLocalToIdb(local, db);
  } catch (e) {
    console.warn("fairway migrate", e);
    return;
  }
  let recovered = { restoredKeys: [] };
  try {
    recovered = await recoverMissingLocal(local, db);
    if (recovered.restoredKeys && recovered.restoredKeys.length) {
      result = await migrateLocalToIdb(local, db);
    }
  } catch (e) {
    console.warn("fairway recover", e);
  }
  attachLocalMirror(local, db);
  const restoredActive = recovered.restoredKeys && recovered.restoredKeys.indexOf(ACTIVE_KEY) >= 0;
  const state = window.state || {};
  const players = window.PLAYERS || [];
  const memoryMarks = players.some((p) => window.playerHasMarks && window.playerHasMarks(p));
  if (restoredActive && !memoryMarks && !state._newRoundArmed && !state._roundSaved && !state._activeRoundLive) {
    try {
      if (typeof window.restoreActiveRound === "function") window.restoreActiveRound();
    } catch (e) {
      console.warn("fairway restore", e);
    }
  }
  window.__fairwayMigration = result;
}

boot();
