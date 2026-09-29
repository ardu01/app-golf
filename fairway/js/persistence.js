import {
  ACTIVE_BAK_KEY,
  ACTIVE_KEY,
  APP_VERSION,
  BACKUP_SCHEMA,
  DRIVE_META_KEY,
  JSON_KEYS,
  MIGRATION_BACKUP_KEY,
  MIGRATION_STATE_KEY,
  MIRRORED_KEYS
} from "./keys.js";

export function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
}

export function sameValue(a, b) {
  return stable(a) === stable(b);
}

export function hashSnapshot(snapshot) {
  const text = MIRRORED_KEYS.map((k) => k + "=" + (snapshot[k] == null ? "" : snapshot[k])).join("\n");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function snapshotLocal(localStorage) {
  const out = {};
  for (const key of MIRRORED_KEYS) {
    try {
      out[key] = localStorage.getItem(key);
    } catch (e) {
      const err = new Error("read");
      err.name = "LocalReadFail";
      throw err;
    }
  }
  return out;
}

function blank(raw) {
  return raw == null || raw === "";
}

export function stripSecrets(key, value) {
  if (key !== DRIVE_META_KEY || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy = {};
  Object.keys(value).forEach((k) => {
    if (k === "access_token" || k === "refresh_token" || k === "id_token" || k === "token") return;
    copy[k] = value[k];
  });
  return copy;
}

export function decodeRaw(key, raw) {
  if (blank(raw)) return { skip: true };
  if (JSON_KEYS.indexOf(key) < 0) return { value: String(raw) };
  try {
    return { value: stripSecrets(key, JSON.parse(raw)) };
  } catch (e) {
    return { corrupt: true };
  }
}

export function encodeForLocal(key, value) {
  if (JSON_KEYS.indexOf(key) >= 0) return JSON.stringify(value);
  return value == null ? "" : String(value);
}

export function activeRoundUsable(raw) {
  if (blank(raw)) return false;
  try {
    const data = JSON.parse(raw);
    return !!(data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.players) && data.players.length);
  } catch (e) {
    return false;
  }
}

/** A good local active round is never replaced by a recovered or imported copy. */
export function localActiveWriteAllowed(raw) {
  return !activeRoundUsable(raw);
}

function failureReason(err) {
  if (err && err.name === "QuotaExceededError") return "quota";
  if (err && err.name === "LocalReadFail") return "read";
  return "write";
}

function anyLocal(snapshot) {
  return MIRRORED_KEYS.some((k) => !blank(snapshot[k]));
}

/**
 * Copy localStorage into the IDB adapter.
 * Originals are never removed. A verified run with the same bytes is a no-op.
 * in_progress is the interrupted / suspended marker; the next call resumes.
 */
export async function migrateLocalToIdb(localStorage, idb, opts) {
  const options = opts || {};
  let localSnapshot;
  try {
    localSnapshot = snapshotLocal(localStorage);
  } catch (e) {
    return { ok: false, action: "read", deletedLocal: false, schema: BACKUP_SCHEMA };
  }
  const sourceHash = hashSnapshot(localSnapshot);
  const prev = await idb.get(MIGRATION_STATE_KEY);
  if (prev && prev.status === "verified" && prev.sourceHash === sourceHash && !options.force) {
    return { ok: true, action: "noop", deletedLocal: false, schema: BACKUP_SCHEMA };
  }

  const live = anyLocal(localSnapshot);
  if (!live) {
    const backup = await idb.get(MIGRATION_BACKUP_KEY);
    const backupHas = !!(backup && backup.raw && anyLocal(backup.raw));
    const idbHas = await idbHasPayload(idb);
    if ((prev && prev.status === "verified" && idbHas) || backupHas || idbHas) {
      return { ok: true, action: "keep-idb", deletedLocal: false, schema: BACKUP_SCHEMA, recoverable: true };
    }
  }

  try {
    await idb.set(MIGRATION_BACKUP_KEY, {
      savedAt: new Date().toISOString(),
      raw: localSnapshot,
      sourceHash: sourceHash,
      schema: BACKUP_SCHEMA
    });
  } catch (e) {
    return {
      ok: false,
      action: failureReason(e),
      status: prev && prev.status ? prev.status : "idle",
      deletedLocal: false,
      schema: BACKUP_SCHEMA
    };
  }

  try {
    await idb.set(MIGRATION_STATE_KEY, {
      status: "in_progress",
      schema: BACKUP_SCHEMA,
      appVersion: APP_VERSION,
      startedAt: new Date().toISOString(),
      sourceHash: sourceHash
    });
  } catch (e) {
    return { ok: false, action: failureReason(e), status: "in_progress", deletedLocal: false, schema: BACKUP_SCHEMA };
  }

  const skipped = [];
  const written = [];
  let payloadWrites = 0;
  for (const key of MIRRORED_KEYS) {
    const raw = localSnapshot[key];
    if (blank(raw)) {
      if (live) {
        const existing = await idb.get(key);
        if (existing !== undefined) {
          try { await idb.del(key); } catch (e) {
            return { ok: false, action: failureReason(e), status: "in_progress", deletedLocal: false, schema: BACKUP_SCHEMA, skipped: skipped };
          }
        }
      }
      continue;
    }
    const decoded = decodeRaw(key, raw);
    if (decoded.corrupt) {
      skipped.push({ key: key, reason: "corrupt" });
      continue;
    }
    if (options.interruptAfterPayloadWrites != null && payloadWrites >= options.interruptAfterPayloadWrites) {
      return {
        ok: false,
        action: "interrupted",
        status: "in_progress",
        deletedLocal: false,
        schema: BACKUP_SCHEMA,
        skipped: skipped,
        written: written
      };
    }
    try {
      await idb.set(key, decoded.value);
    } catch (e) {
      return {
        ok: false,
        action: failureReason(e),
        status: "in_progress",
        deletedLocal: false,
        schema: BACKUP_SCHEMA,
        skipped: skipped,
        written: written,
        key: key
      };
    }
    payloadWrites++;
    written.push(key);
  }

  for (const key of written) {
    const got = await idb.get(key);
    const decoded = decodeRaw(key, localSnapshot[key]);
    if (!sameValue(got, decoded.value)) {
      return { ok: false, action: "verify", status: "in_progress", deletedLocal: false, schema: BACKUP_SCHEMA, key: key };
    }
  }

  try {
    await idb.set(MIGRATION_STATE_KEY, {
      status: "verified",
      schema: BACKUP_SCHEMA,
      appVersion: APP_VERSION,
      sourceHash: sourceHash,
      verifiedAt: new Date().toISOString(),
      skipped: skipped,
      deletedLocal: false
    });
  } catch (e) {
    return { ok: false, action: failureReason(e), status: "in_progress", deletedLocal: false, schema: BACKUP_SCHEMA, skipped: skipped };
  }

  return {
    ok: true,
    action: skipped.length ? "migrated-partial" : "migrated",
    deletedLocal: false,
    schema: BACKUP_SCHEMA,
    skipped: skipped,
    written: written
  };
}

async function idbHasPayload(idb) {
  for (const key of MIRRORED_KEYS) {
    const value = await idb.get(key);
    if (value !== undefined) return true;
  }
  return false;
}

/**
 * Fill localStorage only where a key is missing.
 * A usable active round already on the device is left untouched.
 * A corrupt active round is also left untouched so the existing .bak UI can run.
 */
export async function recoverMissingLocal(localStorage, idb) {
  const restoredKeys = [];
  const kept = [];
  let backup;
  try { backup = await idb.get(MIGRATION_BACKUP_KEY); } catch (e) { backup = null; }
  for (const key of MIRRORED_KEYS) {
    let raw;
    try { raw = localStorage.getItem(key); } catch (e) {
      return { ok: false, action: "read", restoredKeys: restoredKeys, kept: kept, overwrittenActive: false };
    }
    if (!blank(raw)) {
      if ((key === ACTIVE_KEY || key === ACTIVE_BAK_KEY) && !activeRoundUsable(raw)) {
        kept.push({ key: key, reason: "corrupt-local" });
      } else {
        kept.push({ key: key, reason: "present" });
      }
      continue;
    }
    if (key === ACTIVE_KEY) {
      let bak = null;
      try { bak = localStorage.getItem(ACTIVE_BAK_KEY); } catch (e) { bak = null; }
      if (!blank(bak)) {
        kept.push({ key: key, reason: "bak-present" });
        continue;
      }
    }
    let value;
    try { value = await idb.get(key); } catch (e) { value = undefined; }
    if (value !== undefined) {
      localStorage.setItem(key, encodeForLocal(key, value));
      restoredKeys.push(key);
      continue;
    }
    const fromBackup = backup && backup.raw ? backup.raw[key] : null;
    if (!blank(fromBackup)) {
      localStorage.setItem(key, fromBackup);
      restoredKeys.push(key);
    }
  }
  return { ok: true, restoredKeys: restoredKeys, kept: kept, overwrittenActive: false };
}

export function shouldMirrorKey(key) {
  return MIRRORED_KEYS.indexOf(key) >= 0;
}

export function attachLocalMirror(localStorage, idb) {
  const origSet = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);
  try {
    localStorage.setItem = function (key, value) {
      origSet(key, value);
      if (!shouldMirrorKey(key)) return;
      const decoded = decodeRaw(key, String(value));
      if (decoded.corrupt || decoded.skip) return;
      Promise.resolve(idb.set(key, decoded.value)).catch(function () {});
    };
    localStorage.removeItem = function (key) {
      origRemove(key);
      if (!shouldMirrorKey(key)) return;
      Promise.resolve(idb.del(key)).catch(function () {});
    };
    return true;
  } catch (e) {
    return false;
  }
}
