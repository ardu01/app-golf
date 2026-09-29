import { SHARED_KEY } from "./keys.js";
import {
  applyFieldsToPlayers,
  clonePlayers,
  emptyShared,
  fieldKey,
  loadShared,
  makeCode,
  makeDeviceId,
  normalizeCode,
  noteLocalDeltas,
  playersToFields,
  sanitizeDelta,
  sharedStatus,
  stampExisting,
  syncShared,
  transportLabel
} from "./shared-round.js";
import { createRoomMailbox, FAIRWAY_ROOM_HTTP } from "./shared-mail.js";
import { createFastPath } from "./shared-rtc.js";

const root = globalThis;
let shared = emptyShared("");
let shadow = [];
let mailbox = null;
let fast = null;
let signals = [];
let timer = 0;
let flushing = false;
let flushAgain = false;
let booted = false;

function now() {
  return Date.now();
}

function online() {
  try { return root.navigator ? root.navigator.onLine !== false : true; } catch (e) { return true; }
}

function toast(msg) {
  try { if (typeof root.showToast === "function") root.showToast(msg); } catch (e) {}
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readRaw() {
  try { return root.localStorage.getItem(SHARED_KEY); } catch (e) { return null; }
}

function save() {
  try { root.localStorage.setItem(SHARED_KEY, JSON.stringify(shared)); } catch (e) {}
}

function players() {
  return Array.isArray(root.PLAYERS) ? root.PLAYERS : [];
}

function meta() {
  const state = root.state || {};
  const setup = state.setup || {};
  return {
    courseId: setup.courseId || "",
    club: setup.club || root.CLUB || "",
    tee: setup.tee || "",
    holes: setup.holes === 9 ? 9 : 18,
    players: players()
  };
}

function ensureMailbox() {
  if (mailbox) return mailbox;
  mailbox = createRoomMailbox({ httpBase: FAIRWAY_ROOM_HTTP });
  if (mailbox.subscribe) {
    mailbox.subscribe((topic, doc) => {
      if (!shared.code || !doc || doc.code !== shared.code) return;
      ingest(doc);
    });
  }
  return mailbox;
}

function driveMailbox() {
  return {
    transport: "drive",
    async get(code) {
      if (typeof root.fairwayDriveRoomGet !== "function") throw new Error("drive");
      const res = await root.fairwayDriveRoomGet(code, shared.driveFileId);
      if (!res || res.skipped) throw new Error("drive");
      if (res.fileId) shared.driveFileId = res.fileId;
      return res.doc || null;
    },
    async put(code, doc) {
      if (typeof root.fairwayDriveRoomPut !== "function") throw new Error("drive");
      const res = await root.fairwayDriveRoomPut(code, doc, shared.driveFileId);
      if (!res || res.skipped) throw new Error("drive");
      if (res.fileId) shared.driveFileId = res.fileId;
    },
    subscribe() { return function () {}; },
    close() {}
  };
}

function fallbackMailbox(primary) {
  let useDrive = false;
  const state = { transport: primary.transport || "mqtt" };
  return {
    get transport() { return state.transport; },
    async get(code) {
      if (useDrive) return driveMailbox().get(code);
      try { return await primary.get(code); }
      catch (e) {
        useDrive = true;
        state.transport = "drive";
        return driveMailbox().get(code);
      }
    },
    async put(code, doc) {
      if (useDrive) return driveMailbox().put(code, doc);
      try { return await primary.put(code, doc); }
      catch (e) {
        useDrive = true;
        state.transport = "drive";
        return driveMailbox().put(code, doc);
      }
    },
    subscribe(fn) { return primary.subscribe ? primary.subscribe(fn) : function () {}; },
    close() { if (primary.close) primary.close(); }
  };
}

function paintScores(next, changed) {
  if (!changed) return;
  const list = players();
  next.forEach((src) => {
    const dst = list.find((p) => p && p.id === src.id);
    if (!dst) return;
    dst.scores = Object.assign({}, src.scores);
    dst.putts = Object.assign({}, src.putts);
    dst.fir = Object.assign({}, src.fir);
    dst.gir = Object.assign({}, src.gir);
    if (src.ball != null) dst.ball = src.ball;
    dst.withdrawn = !!src.withdrawn;
    dst.totalsGross = null;
    dst.totalsPutts = null;
  });
  root.__fairwaySharedApplying = true;
  try {
    if (typeof root.persistActiveRound === "function") root.persistActiveRound();
  } finally {
    root.__fairwaySharedApplying = false;
  }
  shadow = clonePlayers(players());
  try { if (typeof root.renderHole === "function" && root.state && root.state.screen === "hole") root.renderHole(); } catch (e) {}
  try { if (typeof root.updateHomeThru === "function") root.updateHomeThru(); } catch (e) {}
  try { if (typeof root.renderScorecard === "function" && root.state && root.state.screen === "scorecard") root.renderScorecard(); } catch (e) {}
  try { if (typeof root.renderLeader === "function" && root.state && root.state.screen === "leader") root.renderLeader(); } catch (e) {}
}

function localHasMarks() {
  return players().some((p) => typeof root.playerHasMarks === "function" && root.playerHasMarks(p));
}

function adoptRoom(doc) {
  if (!doc || !doc.meta || localHasMarks()) return;
  const state = root.state;
  if (!state || !state.setup) return;
  const course = Array.isArray(root.COURSES) ? root.COURSES.find((c) => c.id === doc.meta.courseId) : null;
  if (course && typeof root.applyCourseData === "function") {
    try { root.applyCourseData(course, doc.meta.tee || state.setup.tee, false); } catch (e) {}
  }
  if (doc.meta.holes === 9 || doc.meta.holes === 18) state.setup.holes = doc.meta.holes;
  const roster = doc.meta.players || [];
  if (!roster.length || !Array.isArray(root.PLAYERS)) return;
  root.PLAYERS.length = 0;
  roster.forEach((p) => {
    const hcp = p.hcp == null ? null : Number(p.hcp);
    root.PLAYERS.push({
      id: p.id,
      rp: "rp-" + p.id,
      name: p.name || "",
      short: p.short || (p.name || "?").slice(0, 3),
      initials: p.initials || (p.name || "?").slice(0, 2).toUpperCase(),
      hcp: Number.isFinite(hcp) ? hcp : null,
      ph: Number.isFinite(hcp) ? Math.round(hcp) : null,
      ch: Number.isFinite(hcp) ? Math.round(hcp) : null,
      avatar: "",
      guest: !!p.guest,
      ball: "",
      withdrawn: false,
      scores: {},
      putts: {},
      fir: {},
      gir: {},
      totalsGross: null,
      totalsPutts: null,
      creativePts: 0,
      creativeLog: []
    });
  });
  state.setup.players = roster.map(() => true);
  try { if (typeof root.refreshPlayerHandicaps === "function") root.refreshPlayerHandicaps(); } catch (e) {}
}

function ensureRemotePlayers(doc) {
  if (!doc || !doc.meta || !Array.isArray(doc.meta.players) || !Array.isArray(root.PLAYERS)) return false;
  const state = root.state;
  let added = false;
  doc.meta.players.forEach((p) => {
    if (!p || !p.id || root.PLAYERS.some((x) => x && x.id === p.id)) return;
    if (root.PLAYERS.length >= 8) return;
    const hcp = p.hcp == null ? null : Number(p.hcp);
    root.PLAYERS.push({
      id: p.id,
      rp: "rp-" + p.id,
      name: p.name || "",
      short: p.short || (p.name || "?").slice(0, 3),
      initials: p.initials || (p.name || "?").slice(0, 2).toUpperCase(),
      hcp: Number.isFinite(hcp) ? hcp : null,
      ph: Number.isFinite(hcp) ? Math.round(hcp) : null,
      ch: Number.isFinite(hcp) ? Math.round(hcp) : null,
      avatar: "",
      guest: p.guest !== false,
      ball: "",
      withdrawn: false,
      scores: {},
      putts: {},
      fir: {},
      gir: {},
      totalsGross: null,
      totalsPutts: null,
      creativePts: 0,
      creativeLog: []
    });
    if (state && state.setup && Array.isArray(state.setup.players)) state.setup.players.push(true);
    added = true;
  });
  return added;
}

function laterStamps(primary, extra) {
  const out = Object.assign({}, primary || {});
  Object.keys(extra || {}).forEach((key) => {
    const at = Number(extra[key]) || 0;
    if (at && (!out[key] || at > out[key])) out[key] = at;
  });
  return out;
}

function refreshSurfaces() {
  try { if (typeof root.renderHole === "function" && root.state && root.state.screen === "hole") root.renderHole(); } catch (e) {}
  try { if (typeof root.updateHomeThru === "function") root.updateHomeThru(); } catch (e) {}
  try { if (typeof root.renderScorecard === "function" && root.state && root.state.screen === "scorecard") root.renderScorecard(); } catch (e) {}
  try { if (typeof root.renderLeader === "function" && root.state && root.state.screen === "leader") root.renderLeader(); } catch (e) {}
  try { if (typeof root.renderAjustes === "function" && root.state && root.state.screen === "ajustes") root.renderAjustes(); } catch (e) {}
}

async function flush() {
  if (!shared.code) return;
  if (flushing) { flushAgain = true; return; }
  flushing = true;
  shared.syncing = true;
  render();
  const box = fallbackMailbox(ensureMailbox());
  try {
    let attempts = 0;
    while (attempts < 4) {
      attempts++;
      const stampSnap = Object.assign({}, shared.stamps);
      const result = await syncShared({
        shared: shared,
        players: players(),
        mailbox: box,
        online: online(),
        now: now(),
        meta: meta(),
        transport: box.transport,
        signals: signals
      });
      if (result.conflict && shared.role === "host" && !shared.joinedForeign) {
        shared.code = makeCode();
        shared.createdBy = shared.deviceId;
        shared.status = "pending";
        save();
        toast("Ese código ya existía. Hay uno nuevo: " + shared.code);
        continue;
      }
      shared = result.shared;
      if (box.transport) shared.transport = box.transport;
      if (!shared.seal && result.doc) {
        if (!localHasMarks() && shared.joinedForeign) adoptRoom(result.doc);
        if (result.changed) paintScores(result.players, true);
        const added = ensureRemotePlayers(result.doc);
        const applied = applyFieldsToPlayers(players(), result.doc.fields || {}, stampSnap);
        if (applied.changed) {
          shared.stamps = laterStamps(shared.stamps, applied.stamps);
          paintScores(applied.players, true);
        } else if (added) {
          shadow = clonePlayers(players());
          root.__fairwaySharedApplying = true;
          try {
            if (typeof root.persistActiveRound === "function") root.persistActiveRound();
          } finally {
            root.__fairwaySharedApplying = false;
          }
          refreshSurfaces();
        }
      } else if (result.changed && !shared.seal) {
        paintScores(result.players, true);
      }
      save();
      if (result.doc) armFast(result.doc);
      break;
    }
    if (shared.seal && shared.code && !(shared.pending && shared.pending.length) && shared.status === "synced") {
      detach();
      toast("La sala se cerró con la ronda. Los golpes siguen en este móvil.");
    }
  } catch (e) {
    shared.status = "error";
    shared.lastError = "sync";
    shared.syncing = false;
    save();
  } finally {
    flushing = false;
    shared.syncing = false;
    render();
    if (flushAgain) {
      flushAgain = false;
      flush();
    }
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = 0; flush(); }, 400);
}

function ingest(doc) {
  if (!doc || shared.seal || !shared.code || doc.code !== shared.code) return;
  const hadMarks = localHasMarks();
  if (!hadMarks && shared.joinedForeign) adoptRoom(doc);
  if (hadMarks) shared.stamps = stampExisting(players(), shared.stamps, now()).stamps;
  const added = ensureRemotePlayers(doc);
  const applied = applyFieldsToPlayers(players(), doc.fields || {}, shared.stamps);
  if (applied.changed) {
    shared.stamps = laterStamps(shared.stamps, applied.stamps);
    paintScores(applied.players, true);
    save();
    render();
  } else if (added) {
    shadow = clonePlayers(players());
    save();
    refreshSurfaces();
    render();
  }
  armFast(doc);
}

function armFast(doc) {
  if (shared.seal || !shared.code) return;
  try {
    if (!fast) {
      fast = createFastPath({
        selfId: shared.deviceId,
        now: now,
        sendSignal: (kind, data, to) => {
          signals.push({
            id: shared.deviceId.slice(0, 6) + kind.slice(0, 3) + String(now() % 100000),
            from: shared.deviceId,
            to: to || "*",
            kind: kind,
            data: data,
            at: now()
          });
          signals = signals.slice(-16);
          schedule();
        },
        onDelta: (msg) => {
          const delta = sanitizeDelta(msg);
          if (!delta || delta.by === shared.deviceId) return;
          const applied = applyFieldsToPlayers(players(), {
            [fieldKey(delta.playerId, delta.hole, delta.field)]: {
              v: delta.value,
              at: delta.at,
              by: delta.by
            }
          }, shared.stamps);
          if (!applied.changed) return;
          shared.stamps = applied.stamps;
          paintScores(applied.players, true);
          save();
          schedule();
        }
      });
    }
    fast.ingest(doc);
  } catch (e) {}
}

function pushFast(deltas) {
  if (!fast || !fast.sendDelta) return;
  deltas.forEach((delta) => fast.sendDelta(delta));
}

function render() {
  const status = sharedStatus(shared, online());
  const via = transportLabel(shared.transport);
  const html = panelHtml(status, via);
  ["sharedRoundHome", "sharedRoundAjustes", "sharedRoundInvite"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
  const hole = document.getElementById("sharedRoundHole");
  if (hole) {
    if (!shared.code) {
      hole.hidden = true;
      hole.textContent = "";
    } else {
      hole.hidden = false;
      hole.textContent = "Compartida " + shared.code + " · " + status.label;
    }
  }
}

function panelHtml(status, via) {
  if (!shared.code) {
    return `
      <div class="card shared-card" data-shared-panel>
        <div class="eyebrow">Partida compartida</div>
        <p class="micro">Opcional. Sin cobertura se anota igual en este móvil. Con red se envían los golpes de cada hoyo.</p>
        <input class="shared-code-input" type="text" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Código" aria-label="Código de la partida" />
        <div class="row" style="gap:8px;margin-top:12px;">
          <button type="button" class="btn btn-primary" style="flex:1" onclick="fairwaySharedCreate()">Crear código</button>
          <button type="button" class="btn btn-ghost" style="flex:1" onclick="fairwaySharedJoin(this)">Unirme</button>
        </div>
      </div>`;
  }
  const viaLine = via ? `<p class="micro">Vía ${esc(via)}. Otro móvil con el código recibe los mismos golpes.</p>` : `<p class="micro">Otro móvil con el código recibe los mismos golpes.</p>`;
  return `
    <div class="card shared-card" data-shared-panel>
      <div class="eyebrow">Partida compartida</div>
      <div class="shared-code" aria-label="Código">${esc(shared.code)}</div>
      <p class="shared-status" data-shared-status="${esc(status.id)}">${esc(status.label)}</p>
      ${viaLine}
      <div class="row" style="gap:8px;margin-top:12px;">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="fairwaySharedCopy()">Copiar código</button>
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="fairwaySharedFlush()">Reintentar</button>
      </div>
      <button type="button" class="btn btn-ghost mt-8" onclick="fairwaySharedLeave()">Dejar la sala</button>
    </div>`;
}

function detach() {
  shared.code = "";
  shared.role = "";
  shared.createdBy = "";
  shared.joinedForeign = false;
  shared.pending = [];
  shared.seal = false;
  shared.status = "idle";
  shared.lastError = "";
  shared.transport = "";
  shared.driveFileId = "";
  signals = [];
  if (fast) {
    try { fast.stop(); } catch (e) {}
    fast = null;
  }
  save();
  render();
}

function fieldsToPending(fields) {
  return Object.keys(fields).map((key) => {
    const parts = key.split("|");
    return {
      playerId: parts[0],
      hole: parts[1] === "" ? "" : Number(parts[1]),
      field: parts[2],
      value: fields[key].v,
      at: fields[key].at,
      by: shared.deviceId
    };
  });
}

async function createRoom() {
  if (!shared.deviceId) shared.deviceId = makeDeviceId();
  shared = loadShared(shared, shared.deviceId);
  shared.code = makeCode();
  shared.role = "host";
  shared.createdBy = shared.deviceId;
  shared.joinedForeign = false;
  shared.seal = false;
  const snap = clonePlayers(players());
  shared.stamps = stampExisting(snap, {}, now()).stamps;
  shared.pending = fieldsToPending(playersToFields(snap, shared.stamps, shared.deviceId));
  shared.status = online() ? "pending" : "offline";
  shadow = clonePlayers(players());
  save();
  render();
  toast("Código " + shared.code + ". Se puede anotar sin cobertura.");
  schedule();
}

async function joinRoom(raw) {
  const code = normalizeCode(raw);
  if (!code) {
    toast("El código tiene 6 letras o números, sin 0, 1, I ni O.");
    return;
  }
  if (!shared.deviceId) shared.deviceId = makeDeviceId();
  const box = fallbackMailbox(ensureMailbox());
  let remote = null;
  try {
    if (!online()) throw new Error("offline");
    remote = await box.get(code);
  } catch (e) {
    toast("Sin conexión. La partida de este móvil sigue aquí. Prueba el código cuando haya red.");
    return;
  }
  if (!remote) {
    toast("No hay partida con ese código.");
    return;
  }
  const hadMarks = localHasMarks();
  adoptRoom(remote);
  ensureRemotePlayers(remote);
  if (hadMarks) shared.stamps = stampExisting(players(), shared.stamps, now()).stamps;
  const applied = applyFieldsToPlayers(players(), remote.fields || {}, shared.stamps);
  if (applied.changed) {
    shared.stamps = laterStamps(shared.stamps, applied.stamps);
    paintScores(applied.players, true);
  }
  shared.stamps = stampExisting(players(), shared.stamps, hadMarks ? now() : 1).stamps;
  if (applied.changed) shared.stamps = laterStamps(shared.stamps, applied.stamps);
  shared.code = code;
  shared.role = "join";
  shared.createdBy = remote.createdBy || "";
  shared.joinedForeign = true;
  shared.seal = false;
  shadow = clonePlayers(players());
  save();
  toast(hadMarks
    ? "Sala unida. Los golpes de este móvil se quedan."
    : "Sala unida.");
  await flush();
  try {
    if (root.state && !root.state._roundSaved && typeof root.go === "function" && root.state.screen === "home") {
      if (typeof root.persistActiveRound === "function") root.persistActiveRound();
    }
  } catch (e) {}
  render();
}

function afterPersist() {
  if (!booted || !shared.code || shared.seal || root.__fairwaySharedApplying) return;
  const deltas = noteLocalDeltas(shared, shadow, players(), now());
  shadow = clonePlayers(players());
  if (!deltas.length) return;
  save();
  render();
  pushFast(deltas);
  schedule();
}

function roundClosed() {
  if (!shared.code) return;
  shared.seal = true;
  const snap = clonePlayers(players());
  save();
  const box = fallbackMailbox(ensureMailbox());
  syncShared({
    shared: shared,
    players: snap,
    mailbox: box,
    online: online(),
    now: now(),
    meta: meta(),
    transport: box.transport,
    signals: signals
  }).then((result) => {
    shared = result.shared;
    shared.seal = true;
    save();
    if (!shared.pending.length && shared.status === "synced") {
      detach();
      toast("La sala se cerró con la ronda. Los golpes siguen en este móvil.");
    } else {
      render();
    }
  }).catch(() => { render(); });
}

function boot() {
  shared = loadShared(readRaw(), "");
  if (!shared.deviceId) {
    shared.deviceId = makeDeviceId();
    save();
  }
  shadow = clonePlayers(players());
  booted = true;
  root.fairwaySharedCreate = createRoom;
  root.fairwaySharedJoin = function (btn) {
    const rootEl = btn && btn.closest ? btn.closest("[data-shared-panel]") : null;
    const input = rootEl ? rootEl.querySelector("input") : document.querySelector(".shared-code-input");
    joinRoom(input ? input.value : "");
  };
  root.fairwaySharedLeave = function () {
    const ok = root.confirm ? root.confirm("Se deja la sala. Los golpes de este móvil no se borran.") : true;
    if (!ok) return;
    detach();
    toast("Sala cerrada en este móvil.");
  };
  root.fairwaySharedCopy = async function () {
    if (!shared.code) return;
    try {
      if (root.navigator && root.navigator.clipboard) await root.navigator.clipboard.writeText(shared.code);
      toast("Código copiado");
    } catch (e) {
      toast(shared.code);
    }
  };
  root.fairwaySharedFlush = function () { flush(); };
  root.fairwaySharedAfterPersist = afterPersist;
  root.fairwaySharedRoundClosed = roundClosed;
  root.fairwayRenderShared = render;
  render();
  if (shared.code) schedule();
  setTimeout(() => {
    if (!shared.code || shared.seal) return;
    const deltas = noteLocalDeltas(shared, shadow, players(), now());
    shadow = clonePlayers(players());
    if (!deltas.length) return;
    save();
    render();
    schedule();
  }, 1500);
  root.addEventListener("online", () => { render(); if (shared.code) flush(); });
  root.addEventListener("offline", () => { render(); });
  setInterval(() => {
    if (shared.code && !shared.seal && online()) flush();
  }, 8000);
}

boot();
