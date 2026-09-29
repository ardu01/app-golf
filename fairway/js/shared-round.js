/**
 * Shared-round queue and merge. No network, no DOM.
 * A field changes only when the incoming timestamp is strictly newer.
 * A missing remote field never clears a local score.
 */

export const ROOM_SCHEMA = 1;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const HOLE_FIELDS = ["scores", "putts", "fir", "gir"];
export const PLAYER_FIELDS = ["ball", "withdrawn"];

const FIR = { hit: 1, miss: 1, na: 1 };
const GIR = { yes: 1, no: 1, na: 1 };

export function makeCode(rng, length) {
  const rand = rng || Math.random;
  const n = length || 6;
  let s = "";
  for (let i = 0; i < n; i++) {
    s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return s;
}

export function makeDeviceId(rng) {
  return "d" + makeCode(rng, 8);
}

export function normalizeCode(raw) {
  const s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length !== 6) return "";
  for (let i = 0; i < s.length; i++) {
    if (CODE_ALPHABET.indexOf(s[i]) < 0) return "";
  }
  return s;
}

export function fieldKey(playerId, hole, field) {
  const holePart = hole == null || hole === "" ? "" : String(hole);
  return String(playerId) + "|" + holePart + "|" + field;
}

export function parseFieldKey(key) {
  const parts = String(key || "").split("|");
  if (parts.length !== 3) return null;
  const hole = parts[1] === "" ? "" : Number(parts[1]);
  return { playerId: parts[0], hole: hole, field: parts[2] };
}

export function emptyShared(deviceId) {
  return {
    v: 1,
    deviceId: deviceId || "",
    code: "",
    role: "",
    createdBy: "",
    joinedForeign: false,
    stamps: {},
    pending: [],
    status: "idle",
    lastError: "",
    lastSyncAt: 0,
    transport: "",
    seal: false,
    driveFileId: ""
  };
}

export function loadShared(raw, deviceId) {
  const base = emptyShared(deviceId || makeDeviceId());
  if (!raw) return base;
  let data = raw;
  if (typeof raw === "string") {
    try { data = JSON.parse(raw); } catch (e) { return base; }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return base;
  base.deviceId = safeId(data.deviceId) || base.deviceId;
  base.code = normalizeCode(data.code);
  base.role = data.role === "host" || data.role === "join" ? data.role : "";
  base.createdBy = safeId(data.createdBy);
  base.joinedForeign = !!data.joinedForeign;
  base.stamps = sanitizeStamps(data.stamps);
  base.pending = sanitizePending(data.pending);
  base.status = clipToken(data.status, 16) || "idle";
  base.lastError = clipToken(data.lastError, 24);
  base.lastSyncAt = finiteAt(data.lastSyncAt) || 0;
  base.transport = data.transport === "drive" || data.transport === "http" || data.transport === "mqtt" ? data.transport : "";
  base.seal = !!data.seal;
  base.driveFileId = safeDriveId(data.driveFileId);
  if (!base.code) {
    base.role = "";
    base.pending = [];
    base.seal = false;
  }
  return base;
}

function safeId(id) {
  const s = String(id || "");
  return /^[a-zA-Z0-9_-]{2,40}$/.test(s) ? s : "";
}

function safeDriveId(id) {
  const s = String(id || "");
  return /^[a-zA-Z0-9_-]{10,128}$/.test(s) ? s : "";
}

function clipToken(value, max) {
  return String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, max);
}

function finiteAt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e15) return 0;
  return Math.round(n);
}

function sanitizeStamps(stamps) {
  const out = {};
  if (!stamps || typeof stamps !== "object" || Array.isArray(stamps)) return out;
  Object.keys(stamps).forEach((key) => {
    if (!parseFieldKey(key)) return;
    const at = finiteAt(stamps[key]);
    if (at) out[key] = at;
  });
  return out;
}

function sanitizePending(list) {
  if (!Array.isArray(list)) return [];
  const byKey = {};
  list.slice(0, 600).forEach((item) => {
    const delta = sanitizeDelta(item);
    if (!delta) return;
    const key = fieldKey(delta.playerId, delta.hole, delta.field);
    const prev = byKey[key];
    if (!prev || delta.at >= prev.at) byKey[key] = delta;
  });
  return Object.keys(byKey).map((k) => byKey[k]);
}

export function sanitizeDelta(item) {
  if (!item || typeof item !== "object") return null;
  const playerId = safeId(item.playerId);
  const field = String(item.field || "");
  if (!playerId) return null;
  if (HOLE_FIELDS.indexOf(field) < 0 && PLAYER_FIELDS.indexOf(field) < 0) return null;
  const at = finiteAt(item.at);
  if (!at) return null;
  let hole = "";
  if (HOLE_FIELDS.indexOf(field) >= 0) {
    hole = Math.round(Number(item.hole));
    if (!Number.isFinite(hole) || hole < 1 || hole > 18) return null;
  }
  const value = sanitizeValue(field, item.value);
  if (value === undefined) return null;
  return {
    playerId: playerId,
    hole: hole,
    field: field,
    value: value,
    at: at,
    by: safeId(item.by)
  };
}

export function sanitizeValue(field, value) {
  if (field === "scores") {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 15) return undefined;
    return n;
  }
  if (field === "putts") {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0 || n > 6) return undefined;
    return n;
  }
  if (field === "fir") {
    const s = String(value || "");
    return FIR[s] ? s : undefined;
  }
  if (field === "gir") {
    const s = String(value || "");
    return GIR[s] ? s : undefined;
  }
  if (field === "ball") {
    const s = clipText(value, 48);
    return s;
  }
  if (field === "withdrawn") return !!value;
  return undefined;
}

function clipText(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);
}

export function clonePlayers(players) {
  return (players || []).map((p) => ({
    id: p.id,
    name: p.name,
    short: p.short,
    initials: p.initials,
    hcp: p.hcp,
    guest: !!p.guest,
    ball: p.ball || "",
    withdrawn: !!p.withdrawn,
    scores: Object.assign({}, p.scores || {}),
    putts: Object.assign({}, p.putts || {}),
    fir: Object.assign({}, p.fir || {}),
    gir: Object.assign({}, p.gir || {})
  }));
}

function mapGet(map, hole) {
  if (!map || typeof map !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(map, hole)) return map[hole];
  const s = String(hole);
  if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];
  return undefined;
}

export function readField(player, field, hole) {
  if (!player) return undefined;
  if (field === "ball") return clipText(player.ball, 48);
  if (field === "withdrawn") return !!player.withdrawn;
  return mapGet(player[field], hole);
}

function writeField(player, field, hole, value) {
  if (field === "ball") {
    player.ball = value;
    return;
  }
  if (field === "withdrawn") {
    player.withdrawn = !!value;
    return;
  }
  if (!player[field] || typeof player[field] !== "object") player[field] = {};
  player[field][hole] = value;
}

export function stampExisting(players, stamps, at) {
  const next = Object.assign({}, stamps || {});
  const when = finiteAt(at) || 1;
  (players || []).forEach((player) => {
    const id = safeId(player && player.id);
    if (!id) return;
    HOLE_FIELDS.forEach((field) => {
      for (let hole = 1; hole <= 18; hole++) {
        const value = sanitizeValue(field, readField(player, field, hole));
        if (value === undefined) continue;
        const key = fieldKey(id, hole, field);
        if (!next[key]) next[key] = when;
      }
    });
    PLAYER_FIELDS.forEach((field) => {
      const value = sanitizeValue(field, readField(player, field, ""));
      if (field === "ball" && !value) return;
      if (field === "withdrawn" && !value) return;
      if (value === undefined) return;
      const key = fieldKey(id, "", field);
      if (!next[key]) next[key] = when;
    });
  });
  return { stamps: next };
}

export function diffPlayers(before, after, at, deviceId) {
  const when = finiteAt(at);
  if (!when) return [];
  const prev = indexPlayers(before);
  const next = indexPlayers(after);
  const deltas = [];
  Object.keys(next).forEach((id) => {
    const a = prev[id] || {};
    const b = next[id];
    HOLE_FIELDS.forEach((field) => {
      for (let hole = 1; hole <= 18; hole++) {
        const from = sanitizeValue(field, readField(a, field, hole));
        const to = sanitizeValue(field, readField(b, field, hole));
        if (to === undefined) continue;
        if (sameValue(from, to)) continue;
        deltas.push({ playerId: id, hole: hole, field: field, value: to, at: when, by: deviceId || "" });
      }
    });
    PLAYER_FIELDS.forEach((field) => {
      const from = sanitizeValue(field, readField(a, field, ""));
      const to = sanitizeValue(field, readField(b, field, ""));
      if (to === undefined) return;
      if (field === "ball" && !from && !to) return;
      if (field === "withdrawn" && !from && !to) return;
      if (sameValue(from, to)) return;
      deltas.push({ playerId: id, hole: "", field: field, value: to, at: when, by: deviceId || "" });
    });
  });
  return deltas;
}

function indexPlayers(players) {
  const out = {};
  (players || []).forEach((p) => {
    const id = safeId(p && p.id);
    if (id) out[id] = p;
  });
  return out;
}

function sameValue(a, b) {
  return a === b || (a == null && b == null);
}

export function queueDeltas(pending, deltas) {
  const byKey = {};
  sanitizePending(pending).forEach((delta) => {
    byKey[fieldKey(delta.playerId, delta.hole, delta.field)] = delta;
  });
  (deltas || []).forEach((item) => {
    const delta = sanitizeDelta(item);
    if (!delta) return;
    const key = fieldKey(delta.playerId, delta.hole, delta.field);
    const prev = byKey[key];
    if (!prev || delta.at >= prev.at) byKey[key] = delta;
  });
  return Object.keys(byKey).map((k) => byKey[k]);
}

export function noteLocalDeltas(shared, before, after, now) {
  const deltas = diffPlayers(before, after, now, shared.deviceId);
  deltas.forEach((delta) => {
    shared.stamps[fieldKey(delta.playerId, delta.hole, delta.field)] = delta.at;
  });
  shared.pending = queueDeltas(shared.pending, deltas);
  if (deltas.length && shared.code && !shared.seal) shared.status = "pending";
  return deltas;
}

export function playersToFields(players, stamps, deviceId) {
  const fields = {};
  (players || []).forEach((player) => {
    const id = safeId(player && player.id);
    if (!id) return;
    HOLE_FIELDS.forEach((field) => {
      for (let hole = 1; hole <= 18; hole++) {
        const value = sanitizeValue(field, readField(player, field, hole));
        if (value === undefined) continue;
        const key = fieldKey(id, hole, field);
        const at = finiteAt(stamps && stamps[key]) || 0;
        if (!at) continue;
        fields[key] = { v: value, at: at, by: deviceId || "" };
      }
    });
    PLAYER_FIELDS.forEach((field) => {
      const value = sanitizeValue(field, readField(player, field, ""));
      if (field === "ball" && !value) return;
      if (field === "withdrawn" && !value) return;
      const key = fieldKey(id, "", field);
      const at = finiteAt(stamps && stamps[key]) || 0;
      if (!at) return;
      fields[key] = { v: value, at: at, by: deviceId || "" };
    });
  });
  return fields;
}

export function pendingToFields(pending) {
  const fields = {};
  sanitizePending(pending).forEach((delta) => {
    const key = fieldKey(delta.playerId, delta.hole, delta.field);
    fields[key] = { v: delta.value, at: delta.at, by: delta.by || "" };
  });
  return fields;
}

/** First map wins ties. Keys only present on one side are kept. */
export function mergeFields(primary, incoming) {
  const out = {};
  Object.keys(primary || {}).forEach((key) => {
    const clean = sanitizeField(key, primary[key]);
    if (clean) out[key] = clean;
  });
  Object.keys(incoming || {}).forEach((key) => {
    const clean = sanitizeField(key, incoming[key]);
    if (!clean) return;
    const cur = out[key];
    if (!cur || clean.at > cur.at) out[key] = clean;
  });
  return out;
}

function sanitizeField(key, field) {
  if (!parseFieldKey(key) || !field || typeof field !== "object") return null;
  const parsed = parseFieldKey(key);
  const value = sanitizeValue(parsed.field, field.v != null ? field.v : field.value);
  const at = finiteAt(field.at);
  if (value === undefined || !at) return null;
  return { v: value, at: at, by: safeId(field.by) };
}

/**
 * Write merged fields onto players.
 * Remote wins only when its timestamp is strictly newer than the local stamp,
 * or the local hole has no value yet.
 * Fields absent from `fields` are left untouched.
 */
export function applyFieldsToPlayers(players, fields, stamps) {
  const next = clonePlayers(players);
  const nextStamps = Object.assign({}, stamps || {});
  const byId = indexPlayers(next);
  let changed = false;
  Object.keys(fields || {}).forEach((key) => {
    const parsed = parseFieldKey(key);
    const field = sanitizeField(key, fields[key]);
    if (!parsed || !field) return;
    const player = byId[parsed.playerId];
    if (!player) return;
    const local = sanitizeValue(parsed.field, readField(player, parsed.field, parsed.hole));
    const localAt = finiteAt(nextStamps[key]) || 0;
    const hasLocal = local !== undefined && !(parsed.field === "ball" && local === "") && !(parsed.field === "withdrawn" && local === false);
    if (hasLocal && field.at <= localAt) return;
    if (!hasLocal && field.at < localAt) return;
    if (sameValue(local, field.v) && field.at === localAt) return;
    writeField(player, parsed.field, parsed.hole, field.v);
    nextStamps[key] = field.at;
    changed = true;
  });
  return { players: next, stamps: nextStamps, changed: changed };
}

export function ackPending(pending, remoteFields) {
  return sanitizePending(pending).filter((delta) => {
    const key = fieldKey(delta.playerId, delta.hole, delta.field);
    const remote = sanitizeField(key, remoteFields && remoteFields[key]);
    if (!remote) return true;
    if (remote.at < delta.at) return true;
    return !sameValue(remote.v, delta.value);
  });
}

export function rosterFromPlayers(players) {
  return (players || []).slice(0, 8).map((p) => {
    const id = safeId(p && p.id);
    if (!id) return null;
    const hcp = Number(p.hcp);
    return {
      id: id,
      name: clipText(p.name, 24),
      short: clipText(p.short, 8),
      initials: clipText(p.initials, 4),
      hcp: Number.isFinite(hcp) ? Math.round(hcp * 10) / 10 : null,
      guest: !!p.guest
    };
  }).filter(Boolean);
}

/** Local roster first. Remote ids the local card does not have are appended. */
export function mergeRosters(primary, extra) {
  const out = [];
  const seen = {};
  function take(list) {
    rosterFromPlayers(list).forEach((p) => {
      if (seen[p.id] || out.length >= 8) return;
      seen[p.id] = true;
      out.push(p);
    });
  }
  take(primary);
  take(extra);
  return out;
}

/**
 * Same card on two phones: keep local players and add any remote id
 * the local list does not have, so their hole fields can be applied.
 */
export function mergeRoomPlayers(local, remotePlayers) {
  const next = clonePlayers(local);
  const seen = {};
  next.forEach((p) => {
    const id = safeId(p && p.id);
    if (id) seen[id] = true;
  });
  mergeRosters([], remotePlayers).forEach((p) => {
    if (seen[p.id] || next.length >= 8) return;
    seen[p.id] = true;
    next.push({
      id: p.id,
      name: p.name || "",
      short: p.short || "",
      initials: p.initials || "",
      hcp: p.hcp,
      guest: !!p.guest,
      ball: "",
      withdrawn: false,
      scores: {},
      putts: {},
      fir: {},
      gir: {}
    });
  });
  return next;
}

export function buildRoomDoc(opts) {
  const shared = opts.shared;
  const fields = opts.fields || {};
  const meta = opts.meta || {};
  const remoteMeta = opts.remote && opts.remote.meta;
  const now = finiteAt(opts.now) || 0;
  const presence = {};
  const remotePresence = (opts.remote && opts.remote.presence) || {};
  Object.keys(remotePresence).slice(0, 8).forEach((id) => {
    const safe = safeId(id);
    const at = finiteAt(remotePresence[id] && remotePresence[id].at);
    if (safe && at) presence[safe] = { at: at };
  });
  if (shared.deviceId) presence[shared.deviceId] = { at: now };
  return {
    v: ROOM_SCHEMA,
    code: shared.code,
    createdBy: shared.createdBy || shared.deviceId,
    updatedAt: now,
    updatedBy: shared.deviceId,
    meta: {
      courseId: clipText(meta.courseId, 80),
      club: clipText(meta.club, 80),
      tee: clipText(meta.tee, 40),
      holes: meta.holes === 9 ? 9 : 18,
      players: mergeRosters(meta.players || opts.players || [], remoteMeta && remoteMeta.players)
    },
    fields: fields,
    presence: presence,
    signals: sanitizeSignals(opts.signals).slice(-16)
  };
}

export function sanitizeSignals(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.slice(-24).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const kind = item.kind === "offer" || item.kind === "answer" || item.kind === "ice" ? item.kind : "";
    const from = safeId(item.from);
    const at = finiteAt(item.at);
    if (!kind || !from || !at) return;
    const data = String(item.data || "").slice(0, 4000);
    if (!data) return;
    out.push({
      id: clipToken(item.id, 24) || (from + kind + at).slice(0, 24),
      from: from,
      to: safeId(item.to) || "*",
      kind: kind,
      data: data,
      at: at
    });
  });
  return out;
}

export function sanitizeRoom(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const code = normalizeCode(raw.code);
  if (!code) return null;
  const fields = mergeFields({}, raw.fields || {});
  const presence = {};
  const src = raw.presence && typeof raw.presence === "object" ? raw.presence : {};
  Object.keys(src).slice(0, 8).forEach((id) => {
    const safe = safeId(id);
    const at = finiteAt(src[id] && src[id].at);
    if (safe && at) presence[safe] = { at: at };
  });
  const holes = raw.meta && raw.meta.holes === 9 ? 9 : 18;
  const meta = raw.meta && typeof raw.meta === "object" ? raw.meta : {};
  return {
    v: ROOM_SCHEMA,
    code: code,
    createdBy: safeId(raw.createdBy),
    updatedAt: finiteAt(raw.updatedAt) || 0,
    updatedBy: safeId(raw.updatedBy),
    meta: {
      courseId: clipText(meta.courseId, 80),
      club: clipText(meta.club, 80),
      tee: clipText(meta.tee, 40),
      holes: holes,
      players: rosterFromPlayers(meta.players || [])
    },
    fields: fields,
    presence: presence,
    signals: sanitizeSignals(raw.signals)
  };
}

export function sharedStatus(shared, online) {
  if (!shared || !shared.code) return { id: "idle", label: "Solo en este móvil" };
  if (shared.syncing) return { id: "syncing", label: "Sincronizando" };
  const pending = shared.pending && shared.pending.length;
  if (!online) {
    return {
      id: "offline",
      label: pending ? "Pendiente · sin conexión" : "Sin conexión · la partida sigue aquí"
    };
  }
  if (shared.status === "conflict") return { id: "conflict", label: "Código ocupado" };
  if (pending && shared.lastError) return { id: "error", label: "Pendiente · se reintenta" };
  if (pending) return { id: "pending", label: "Pendiente de enviar" };
  return { id: "synced", label: "Al día" };
}

export function transportLabel(transport) {
  if (transport === "drive") return "Drive";
  if (transport === "http") return "sala pública";
  if (transport === "mqtt") return "buzón";
  return "";
}

/**
 * Pull the room, merge by timestamp, push the union back.
 * Offline or a failed mailbox leaves local scores and the queue in place.
 */
export async function syncShared(opts) {
  const shared = loadShared(opts.shared, opts.shared && opts.shared.deviceId);
  let players = clonePlayers(opts.players);
  const now = finiteAt(opts.now) || Date.now();
  if (!shared.code) return { shared: shared, players: players, changed: false };
  if (opts.online === false) {
    shared.status = "offline";
    shared.syncing = false;
    return { shared: shared, players: players, changed: false };
  }
  const mailbox = opts.mailbox;
  let remoteRaw;
  try {
    remoteRaw = await mailbox.get(shared.code);
  } catch (e) {
    shared.status = "error";
    shared.lastError = "get";
    shared.syncing = false;
    return { shared: shared, players: players, changed: false };
  }
  let remote = remoteRaw ? sanitizeRoom(remoteRaw) : null;
  if (remote && shared.role === "host" && !shared.joinedForeign && remote.createdBy && remote.createdBy !== shared.deviceId) {
    shared.status = "conflict";
    shared.lastError = "code";
    return { shared: shared, players: players, changed: false, conflict: true };
  }
  const stamped = stampExisting(players, shared.stamps, now);
  shared.stamps = stamped.stamps;
  let changed = false;
  let doc = null;
  for (let pass = 0; pass < 2; pass++) {
    const localFields = playersToFields(players, shared.stamps, shared.deviceId);
    const ours = mergeFields(localFields, pendingToFields(shared.pending));
    const merged = mergeFields(ours, remote && remote.fields);
    if (!shared.seal) {
      const applied = applyFieldsToPlayers(players, merged, shared.stamps);
      players = applied.players;
      shared.stamps = applied.stamps;
      if (applied.changed) changed = true;
    }
    const signals = []
      .concat(remote && remote.signals || [])
      .concat(opts.signals || []);
    doc = buildRoomDoc({
      shared: shared,
      players: players,
      fields: merged,
      meta: opts.meta,
      now: now,
      remote: remote,
      signals: signals
    });
    try {
      await mailbox.put(shared.code, doc);
    } catch (e) {
      shared.status = "error";
      shared.lastError = "put";
      shared.syncing = false;
      return { shared: shared, players: players, changed: changed };
    }
    let again = null;
    try { again = sanitizeRoom(await mailbox.get(shared.code)); } catch (e) { again = doc; }
    const echoed = (again && again.fields) || {};
    shared.pending = ackPending(shared.pending, echoed);
    const lost = shared.pending.some((delta) => {
      const key = fieldKey(delta.playerId, delta.hole, delta.field);
      const seen = echoed[key];
      return !seen || seen.at < delta.at;
    });
    remote = again || remote;
    if (!lost) break;
  }
  shared.pending = ackPending(shared.pending, remote && remote.fields);
  shared.status = shared.pending.length ? "pending" : "synced";
  shared.lastError = shared.pending.length ? shared.lastError : "";
  shared.lastSyncAt = now;
  shared.syncing = false;
  if (opts.transport) shared.transport = opts.transport;
  return { shared: shared, players: players, changed: changed, doc: remote || doc };
}

export function createMemoryMailbox(seed) {
  const rooms = seed || new Map();
  const listeners = [];
  return {
    rooms: rooms,
    async get(code) {
      const doc = rooms.get(code);
      return doc ? JSON.parse(JSON.stringify(doc)) : null;
    },
    async put(code, doc) {
      const copy = JSON.parse(JSON.stringify(doc));
      rooms.set(code, copy);
      listeners.forEach((fn) => {
        try { fn(code, JSON.parse(JSON.stringify(copy))); } catch (e) {}
      });
    },
    subscribe(fn) {
      listeners.push(fn);
      return function () {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    close() {}
  };
}
