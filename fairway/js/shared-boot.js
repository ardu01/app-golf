import { SHARED_KEY } from "./keys.js";
import {
  adoptSyncResult,
  applyFieldsToPlayers,
  clonePlayers,
  emptyShared,
  fieldKey,
  loadShared,
  makeCode,
  makeDeviceId,
  mayDetachShared,
  normalizeCode,
  noteLocalDeltas,
  sanitizeDelta,
  sharedPlayingHcp,
  sharedStatus,
  syncShared
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
    mailbox.subscribe(() => {
      if (!shared.code) return;
      schedule();
    });
  }
  return mailbox;
}

function hcpOf(raw) {
  const course = typeof root.courseHandicapFor === "function" ? root.courseHandicapFor : null;
  return sharedPlayingHcp(raw, course);
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
    const hcp = hcpOf(p.hcp);
    root.PLAYERS.push({
      id: p.id,
      rp: "rp-" + p.id,
      name: p.name || "",
      short: p.short || (p.name || "?").slice(0, 3),
      initials: p.initials || (p.name || "?").slice(0, 2).toUpperCase(),
      hcp: hcp.hcp,
      ph: hcp.ph,
      ch: hcp.ch,
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
    const hcp = hcpOf(p.hcp);
    root.PLAYERS.push({
      id: p.id,
      rp: "rp-" + p.id,
      name: p.name || "",
      short: p.short || (p.name || "?").slice(0, 3),
      initials: p.initials || (p.name || "?").slice(0, 2).toUpperCase(),
      hcp: hcp.hcp,
      ph: hcp.ph,
      ch: hcp.ch,
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
  const box = ensureMailbox();
  try {
    let attempts = 0;
    while (attempts < 4) {
      attempts++;
      const result = await syncShared({
        shared: shared,
        players: players(),
        mailbox: box,
        online: online(),
        now: now(),
        meta: meta(),
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
      shared = adoptSyncResult(shared, result);
      if (!shared.seal && result.http && result.doc) {
        if (!localHasMarks() && shared.joinedForeign) adoptRoom(result.doc);
        const added = ensureRemotePlayers(result.doc);
        const applied = applyFieldsToPlayers(players(), result.doc.fields || {}, shared.stamps, shared.marks);
        shared.stamps = applied.stamps;
        shared.marks = applied.marks || shared.marks;
        if (applied.changed) paintScores(applied.players, true);
        else if (added) {
          shadow = clonePlayers(players());
          root.__fairwaySharedApplying = true;
          try {
            if (typeof root.persistActiveRound === "function") root.persistActiveRound();
          } finally {
            root.__fairwaySharedApplying = false;
          }
          refreshSurfaces();
        }
      }
      save();
      if (result.http && result.doc) armFast(result.doc);
      break;
    }
    if (mayDetachShared(shared)) {
      const sealed = shared.seal;
      detach();
      toast(sealed
        ? "La sala se cerró con la ronda. Los golpes siguen en este móvil."
        : "Sala cerrada en este móvil.");
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
              seq: delta.seq || delta.at,
              by: delta.by,
              op: delta.op || ""
            }
          }, shared.stamps, shared.marks);
          if (!applied.changed) return;
          shared.stamps = applied.stamps;
          shared.marks = applied.marks || shared.marks;
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
  const html = panelHtml(status);
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

function panelHtml(status) {
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
  return `
    <div class="card shared-card" data-shared-panel>
      <div class="eyebrow">Partida compartida</div>
      <div class="shared-code" aria-label="Código">${esc(shared.code)}</div>
      <p class="shared-status" data-shared-status="${esc(status.id)}">${esc(status.label)}</p>
      <p class="micro">Otro móvil con el mismo código ve los mismos golpes.</p>
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
  shared.leaving = false;
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

async function createRoom() {
  if (!shared.deviceId) shared.deviceId = makeDeviceId();
  shared = loadShared(shared, shared.deviceId);
  shared.code = makeCode();
  shared.role = "host";
  shared.createdBy = shared.deviceId;
  shared.joinedForeign = false;
  shared.seal = false;
  shared.leaving = false;
  const current = players();
  const blank = clonePlayers(current).map((p) => {
    p.scores = {};
    p.putts = {};
    p.fir = {};
    p.gir = {};
    p.ball = "";
    p.withdrawn = false;
    return p;
  });
  noteLocalDeltas(shared, blank, current, 0);
  shared.status = shared.pending.length ? "pending" : "idle";
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
  const box = ensureMailbox();
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
  const applied = applyFieldsToPlayers(players(), remote.fields || {}, shared.stamps, shared.marks);
  if (applied.changed) {
    shared.stamps = applied.stamps;
    shared.marks = applied.marks || shared.marks;
    paintScores(applied.players, true);
  }
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
  save();
  flush();
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
    shared.leaving = true;
    save();
    flush();
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
  root.addEventListener("online", () => { render(); if (shared.code) flush(); });
  root.addEventListener("offline", () => { render(); });
  setInterval(() => {
    if (shared.code && online()) flush();
  }, 8000);
}

boot();
