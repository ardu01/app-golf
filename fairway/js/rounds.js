/**
 * Round persistence from index.html (Fairway 4.2.6).
 * localStorage is the score. IndexedDB stays a mirror in persistence.js.
 * scope is read on every call so a later HOLES or CLUB assignment stays visible.
 * Backup schema stays 3. Product version is 5.1.3.
 * The live card is written only here: persistActiveRound, writeStoredActiveRound,
 * restoreActiveRound and recoverActiveRoundFromBackup all go through storageSetItem.
 */
import {
  ACTIVE_BAK_KEY,
  ACTIVE_KEY,
  ROUNDS_BAK_KEY,
  ROUNDS_KEY
} from "./keys.js";

const ROUNDS_MAX = 99999;

function createApi(scope) {
  scope = scope || {};
  let state;
  let PLAYERS;
  let HOLES;
  let FX;
  let CLUB;
  let COURSES;
  let localStorage;
  let document;
  let _roundsUnreadable = false;
  let _activeStorageError = "";
  let lifecycleBound = false;

  function sync() {
    state = scope.state;
    PLAYERS = scope.PLAYERS;
    HOLES = scope.HOLES;
    FX = scope.FX;
    CLUB = scope.CLUB;
    COURSES = scope.COURSES;
    localStorage = scope.localStorage || globalThis.localStorage;
    if (scope && Object.prototype.hasOwnProperty.call(scope, "document")) document = scope.document;
    else document = globalThis.document;
  }

  function pageFn(name) {
    const scoped = scope && scope[name];
    if (typeof scoped === "function") return scoped;
    const globalFn = globalThis[name];
    if (typeof globalFn === "function") return globalFn;
    return null;
  }

  function callPage(name, args) {
    const fn = pageFn(name);
    if (typeof fn !== "function") throw new ReferenceError(name + " is not defined");
    return fn.apply(null, args || []);
  }

  function assignHoles(next) {
    HOLES = next;
    if (scope) scope.HOLES = next;
  }

  function assignClub(next) {
    CLUB = next;
    if (scope) scope.CLUB = next;
  }

  function hasStoredActiveRound() {
    sync();
    try { return !!localStorage.getItem(ACTIVE_KEY); } catch (e) { return false; }
  }

  function playerHasMarks(p) {
    sync();
    if (!p) return false;
    if (p.scores && Object.keys(p.scores).length) return true;
    if (p.putts && Object.keys(p.putts).length) return true;
    if (p.fir && Object.keys(p.fir).length) return true;
    if (p.gir && Object.keys(p.gir).length) return true;
    if (p.totalsGross != null || p.totalsPutts != null) return true;
    return false;
  }

  function isRoundInProgress() {
    sync();
    // After cierre, _roundSaved stays set until Nueva partida — never show Continuar
    if (state._roundSaved) return false;
    if (PLAYERS.some(playerHasMarks)) return true;
    try {
      if (inspectActiveKey(ACTIVE_KEY).status === "ok") return true;
    } catch (e) {}
    return false;
  }

  function readRoundList(raw) {
    sync();
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (e) { return null; }
  }

  function historyBak() {
    return readRoundList(localStorage.getItem(ROUNDS_BAK_KEY));
  }

  function roundIds(list) {
    const ids = [];
    (list || []).forEach((row) => {
      if (row && row.id) ids.push(String(row.id));
    });
    return ids;
  }

  function listKeepsIds(list, ids) {
    const have = {};
    roundIds(list).forEach((id) => { have[id] = true; });
    for (let i = 0; i < ids.length; i++) {
      if (!have[ids[i]]) return false;
    }
    return true;
  }

  function adoptHistoryBak(bak) {
    _roundsUnreadable = false;
    try { localStorage.setItem(ROUNDS_KEY, JSON.stringify(bak)); } catch (e) {}
    console.warn("loadRounds: recovered history from local backup");
    if (pageFn("showToast")) callPage("showToast", ["Historial recuperado de la copia local"]);
    return bak;
  }

  function loadRounds() {
    sync();
    try {
      const raw = localStorage.getItem(ROUNDS_KEY);
      // A missing primary is not an empty history. The .bak is the last good list.
      if (!raw) {
        const bak = historyBak();
        if (bak && bak.length) return adoptHistoryBak(bak);
        _roundsUnreadable = false;
        return [];
      }
      const data = readRoundList(raw);
      if (data) { _roundsUnreadable = false; return data; }
      const bak = historyBak();
      if (bak) return adoptHistoryBak(bak);
      _roundsUnreadable = true;
      console.warn("loadRounds: stored history is not a list");
      if (pageFn("showToast")) callPage("showToast", ["El historial guardado no se pudo leer. No se ha borrado."]);
      return [];
    } catch (e) {
      _roundsUnreadable = true;
      console.warn("loadRounds", e);
      if (pageFn("showToast")) callPage("showToast", ["El historial guardado no se pudo leer. No se ha borrado."]);
      return [];
    }
  }

  function saveRounds(list) {
    sync();
    if (_roundsUnreadable) {
      console.warn("saveRounds blocked: stored history is unreadable");
      if (pageFn("showToast")) callPage("showToast", ["No se guarda encima de un historial dañado"]);
      return false;
    }
    try {
      const prev = localStorage.getItem(ROUNDS_KEY);
      const next = JSON.stringify(list);
      const prevList = readRoundList(prev);
      // Only a readable list may become the .bak. A corrupt primary must not erase it.
      if (prev && prev !== next && prevList) {
        try { localStorage.setItem(ROUNDS_BAK_KEY, prev); } catch (e) {}
      }
      localStorage.setItem(ROUNDS_KEY, next);
      if (localStorage.getItem(ROUNDS_KEY) !== next) {
        console.warn("saveRounds short write");
        if (pageFn("showToast")) callPage("showToast", ["No se pudo guardar el historial en este dispositivo"]);
        return false;
      }
      // The .bak lagged one save, so a missing primary restored the previous
      // list and dropped the round just closed. Copy this list only when it
      // still contains every id already stored.
      const committed = readRoundList(next);
      const keptIds = prevList ? roundIds(prevList) : roundIds(historyBak() || []);
      if (committed && listKeepsIds(committed, keptIds)) {
        try { localStorage.setItem(ROUNDS_BAK_KEY, next); } catch (e) {}
      }
      if (prev !== next) callPage("touchDataUpdated");
    } catch (e) {
      console.warn("saveRounds", e);
      if (pageFn("showToast")) callPage("showToast", ["No se pudo guardar el historial en este dispositivo"]);
      return false;
    }
    if (pageFn("queueDriveSync")) callPage("queueDriveSync");
    return true;
  }

  function formatRoundDate(iso) {
    sync();
    try {
      const d = iso ? new Date(iso) : new Date();
      return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return "Hoy"; }
  }

  function snapshotPlayers() {
    sync();
    return PLAYERS.map(p => ({
      id: p.id, name: p.name, short: p.short, initials: p.initials,
      hcp: p.hcp, ch: p.ch, ph: p.ph, guest: !!p.guest,
      ball: (p.ball || "").toString().slice(0, 48),
      withdrawn: !!p.withdrawn,
      scores: Object.assign({}, p.scores),
      putts: Object.assign({}, p.putts),
      fir: Object.assign({}, p.fir || {}),
      gir: Object.assign({}, p.gir || {}),
      totalsGross: (p.totalsGross != null ? Number(p.totalsGross) : null),
      totalsPutts: (p.totalsPutts != null ? Number(p.totalsPutts) : null),
      creativePts: Number(p.creativePts) || 0,
      creativeLog: Array.isArray(p.creativeLog) ? p.creativeLog.slice() : []
    }));
  }

  function inspectActiveRaw(raw) {
    sync();
    if (!raw) return { status: "missing", data: null };
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.players) || !data.players.length) {
        return { status: "corrupt", data: null };
      }
      return { status: "ok", data: data };
    } catch (e) {
      return { status: "corrupt", data: null };
    }
  }

  function inspectActiveKey(key) {
    sync();
    try { return inspectActiveRaw(localStorage.getItem(key)); }
    catch (e) { return { status: "corrupt", data: null }; }
  }

  function noteActiveStorageError(msg) {
    sync();
    _activeStorageError = msg || "No se pudo guardar en este dispositivo";
    let hidden = false;
    try { hidden = typeof document !== "undefined" && document && document.visibilityState === "hidden"; } catch (e) {}
    if (hidden) return;
    if (pageFn("showToast")) callPage("showToast", [_activeStorageError, false, 4200]);
  }

  function flushActiveStorageError() {
    sync();
    if (!_activeStorageError) return;
    let hidden = false;
    try { hidden = typeof document !== "undefined" && document && document.visibilityState === "hidden"; } catch (e) {}
    if (hidden) return;
    const msg = _activeStorageError;
    _activeStorageError = "";
    if (pageFn("showToast")) callPage("showToast", [msg, false, 4200]);
  }

  function storageSetItem(key, value, failMsg) {
    sync();
    try {
      localStorage.setItem(key, value);
      if (localStorage.getItem(key) !== value) {
        noteActiveStorageError(failMsg || "No se pudo guardar en este dispositivo");
        return false;
      }
      return true;
    } catch (e) {
      console.warn("storageSetItem", key, e);
      noteActiveStorageError(failMsg || "No se pudo guardar en este dispositivo");
      return false;
    }
  }

  function activeBackupNeedsRecovery() {
    sync();
    if (state._roundSaved) return false;
    if (inspectActiveKey(ACTIVE_KEY).status === "ok") return false;
    return inspectActiveKey(ACTIVE_BAK_KEY).status === "ok";
  }

  function roundWouldBeReplaced() {
    sync();
    if (state._roundSaved) return false;
    if (inspectActiveKey(ACTIVE_KEY).status === "ok") return true;
    if (inspectActiveKey(ACTIVE_BAK_KEY).status === "ok") return true;
    return PLAYERS.some(playerHasMarks);
  }

  function markMap(player, field) {
    const bag = player && player[field];
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
    return bag;
  }

  function mapKeepsKeys(nextMap, baseMap) {
    if (!baseMap) return true;
    const keys = Object.keys(baseMap);
    for (let i = 0; i < keys.length; i++) {
      if (!nextMap || !Object.prototype.hasOwnProperty.call(nextMap, keys[i])) return false;
    }
    return true;
  }

  function cardPlayer(players, player) {
    if (!player || player.id == null) return null;
    const id = String(player.id);
    for (let i = 0; i < players.length; i++) {
      const row = players[i];
      if (row && row.id != null && String(row.id) === id) return row;
    }
    return null;
  }

  // The last good card is the previous primary when that primary was valid,
  // otherwise the .bak. A card keeps it when every player is still there and
  // every scores, putts, fir and gir key is still there. totalsGross and
  // totalsPutts count only when the baseline value was not null.
  function cardKeepsMarks(nextCard, baseCard) {
    const basePlayers = baseCard && Array.isArray(baseCard.players) ? baseCard.players : [];
    const nextPlayers = nextCard && Array.isArray(nextCard.players) ? nextCard.players : [];
    for (let i = 0; i < basePlayers.length; i++) {
      const prevP = basePlayers[i];
      if (!prevP) return false;
      const nextP = cardPlayer(nextPlayers, prevP);
      if (!nextP) return false;
      if (!mapKeepsKeys(markMap(nextP, "scores"), markMap(prevP, "scores"))) return false;
      if (!mapKeepsKeys(markMap(nextP, "putts"), markMap(prevP, "putts"))) return false;
      if (!mapKeepsKeys(markMap(nextP, "fir"), markMap(prevP, "fir"))) return false;
      if (!mapKeepsKeys(markMap(nextP, "gir"), markMap(prevP, "gir"))) return false;
      if (prevP.totalsGross != null && nextP.totalsGross == null) return false;
      if (prevP.totalsPutts != null && nextP.totalsPutts == null) return false;
    }
    return true;
  }

  function localActiveRoundIsProtected() {
    sync();
    if (!state) return false;
    if (state._newRoundArmed || state._activeRoundLive) return true;
    const screen = state.screen;
    if (screen === "hole" || screen === "scorecard" || screen === "leader" || screen === "ajustes" || screen === "arbitro" || screen === "close" || screen === "setup") return true;
    const primary = inspectActiveKey(ACTIVE_KEY);
    if (primary.status === "corrupt") return true;
    if (primary.status === "missing" && inspectActiveKey(ACTIVE_BAK_KEY).status === "ok") return true;
    if (PLAYERS.some(playerHasMarks)) return true;
    return false;
  }

  function activePlayersNow() {
    sync();
    if (pageFn("activePlayers")) return callPage("activePlayers");
    return PLAYERS || [];
  }

  // Hole marks on the live card. The page paints; this is the only place that
  // changes scores, putts, FIR, GIR and round totals before the save.
  function commitActiveScore(idx, value) {
    sync();
    const p = activePlayersNow()[idx];
    if (!p) return null;
    p.scores[state.hole] = value;
    p.totalsGross = null;
    state.activePlayer = idx;
    persistActiveRound();
    return p;
  }

  function adjustActiveScore(idx, delta) {
    sync();
    const p = activePlayersNow()[idx];
    if (!p) return null;
    const par = HOLES[state.hole - 1].par;
    let cur = p.scores[state.hole];
    if (cur == null) {
      cur = delta > 0 ? par : Math.max(1, par - 1);
      p.scores[state.hole] = cur;
    } else {
      p.scores[state.hole] = Math.max(1, Math.min(15, cur + delta));
    }
    p.totalsGross = null;
    state.activePlayer = idx;
    persistActiveRound();
    return p;
  }

  function commitActivePutts(idx, n) {
    sync();
    const p = activePlayersNow()[idx];
    if (!p) return null;
    p.putts[state.hole] = n;
    state.activePlayer = idx;
    state.dataTier = "stats";
    persistActiveRound();
    return p;
  }

  function adjustActivePutts(idx, delta) {
    sync();
    const p = activePlayersNow()[idx];
    if (!p) return null;
    let cur = p.putts[state.hole];
    if (cur == null) cur = delta > 0 ? 0 : 1;
    p.putts[state.hole] = Math.max(0, Math.min(6, cur + delta));
    state.activePlayer = idx;
    state.dataTier = "stats";
    persistActiveRound();
    return p;
  }

  function commitActiveMark(kind, value) {
    sync();
    if (kind !== "fir" && kind !== "gir") return false;
    state[kind] = value;
    state.dataTier = "stats";
    const list = activePlayersNow();
    const p = list[state.activePlayer] || list[0];
    if (p) {
      if (pageFn("ensurePlayerFirGir")) callPage("ensurePlayerFirGir", [p]);
      if (!p[kind] || typeof p[kind] !== "object") p[kind] = {};
      p[kind][state.hole] = value;
    }
    persistActiveRound();
    return true;
  }

  function commitActiveTotal(idx, kind, value) {
    sync();
    const p = activePlayersNow()[idx];
    if (!p) return false;
    if (kind === "putts") p.totalsPutts = value;
    else p.totalsGross = value;
    persistActiveRound();
    return true;
  }

  // Import and Drive replace the stored primary. They do not rebuild it from
  // memory and they do not move the .bak: that copy stays the last good card
  // written by persistActiveRound.
  function writeStoredActiveRound(payload, failMsg) {
    sync();
    let next;
    try {
      next = typeof payload === "string" ? payload : JSON.stringify(payload);
    } catch (e) {
      noteActiveStorageError(failMsg || "No se pudo guardar la ronda en curso");
      return false;
    }
    return storageSetItem(ACTIVE_KEY, next, failMsg || "No se pudo guardar la ronda en curso");
  }

  function persistActiveRound() {
    sync();
    if (state._newRoundArmed || state._roundSaved) return false;
    try {
      const course = pageFn("getSelectedCourse") ? callPage("getSelectedCourse") : null;
      const payload = {
        v: 1,
        savedAt: new Date().toISOString(),
        hole: state.hole,
        activePlayer: state.activePlayer,
        dataTier: state.dataTier,
        scNine: state.scNine,
        scCard: state.scCard === "net" || state.scCard === "stableford" ? state.scCard : "gross",
        editingRoundId: state.editingRoundId || null,
        setup: JSON.parse(JSON.stringify(state.setup)),
        club: typeof CLUB !== "undefined" ? CLUB : (course && course.name),
        players: snapshotPlayers(),
        setupPlayers: (state.setup && state.setup.players) ? state.setup.players.slice() : [true]
      };
      let prev = null;
      try { prev = localStorage.getItem(ACTIVE_KEY); } catch (e) { prev = null; }
      const next = JSON.stringify(payload);
      let changed = !prev || prev !== next;
      try {
        if (prev) {
          const a = JSON.parse(prev);
          const b = JSON.parse(next);
          delete a.savedAt;
          delete b.savedAt;
          changed = JSON.stringify(a) !== JSON.stringify(b);
        }
      } catch (e) { changed = true; }
      // Never replace a good backup with a corrupt primary.
      if (prev && prev !== next && inspectActiveRaw(prev).status === "ok") {
        storageSetItem(ACTIVE_BAK_KEY, prev, "No se pudo guardar la copia de seguridad");
      }
      if (!storageSetItem(ACTIVE_KEY, next, "No se pudo guardar la ronda en curso")) return false;
      // The .bak lagged one save, so a missing primary restored the previous
      // card and dropped the strokes just written. Copy this card only when
      // it still has every mark from the last good card. The first save has
      // no baseline and still writes the .bak. A failed copy must not fail
      // the save.
      const committed = inspectActiveRaw(next);
      const prevCard = inspectActiveRaw(prev);
      let baseline = prevCard.status === "ok" ? prevCard.data : null;
      if (!baseline) {
        const bakCard = inspectActiveKey(ACTIVE_BAK_KEY);
        if (bakCard.status === "ok") baseline = bakCard.data;
      }
      if (committed.status === "ok" && (!baseline || cardKeepsMarks(committed.data, baseline))) {
        try { localStorage.setItem(ACTIVE_BAK_KEY, next); } catch (e) {}
      }
      _activeStorageError = "";
      state._activeRoundLive = true;
      if (changed) {
        callPage("touchDataUpdated");
        if (pageFn("queueDriveSync")) callPage("queueDriveSync");
      }
      var sharedApplying = false;
      try { sharedApplying = typeof window !== "undefined" && !!window.__fairwaySharedApplying; } catch (e) {}
      if (!sharedApplying && pageFn("fairwaySharedAfterPersist")) {
        try { callPage("fairwaySharedAfterPersist"); } catch (e) {}
      }
      return true;
    } catch (e) {
      console.warn("persistActiveRound", e);
      noteActiveStorageError("No se pudo guardar la ronda en curso");
      return false;
    }
  }

  function clearActiveRound() {
    sync();
    let had = false;
    try { had = !!localStorage.getItem(ACTIVE_KEY) || !!localStorage.getItem(ACTIVE_BAK_KEY); } catch (e) {}
    try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
    try { localStorage.removeItem(ACTIVE_BAK_KEY); } catch (e) {}
    state._activeRoundLive = false;
    if (had) {
      callPage("touchDataUpdated");
      if (pageFn("queueDriveSync")) callPage("queueDriveSync");
    }
  }

  /** After closing a round: wipe storage + scores so Home never shows Continuar */
  function endActiveRoundMemory() {
    sync();
    try { if (pageFn("fairwaySharedRoundClosed")) callPage("fairwaySharedRoundClosed"); } catch (e) {}
    state._activeRoundLive = false;
    clearActiveRound();
    PLAYERS.forEach(p => {
      p.scores = {};
      p.putts = {};
      p.fir = {};
      p.gir = {};
      p.totalsGross = null;
      p.totalsPutts = null;
      p.creativePts = 0;
      p.creativeLog = [];
    });
    state.hole = 1;
    state.activePlayer = 0;
    state.editingRoundId = null;
    try {
      document.querySelectorAll("[data-continue-hole]").forEach(btn => {
        btn.style.display = "none";
        btn.textContent = "Continuar · Hoyo 1";
      });
      document.querySelectorAll("[data-recover-backup]").forEach(btn => {
        btn.style.display = "none";
      });
      document.querySelectorAll("[data-finish-round]").forEach(btn => {
        btn.style.display = "none";
      });
      document.querySelectorAll("[data-round-ajustes]").forEach(btn => {
        btn.style.display = "none";
      });
      const card = document.querySelector("#screen-home .round-card");
      if (card) {
        card.style.display = "";
        card.setAttribute("data-active", "0");
      }
    } catch (e) {}
    if (pageFn("updateHomeThru")) callPage("updateHomeThru");
  }

  function applyActivePayload(data) {
    sync();
    if (!data || !data.players || !data.players.length) return false;
    if (data.setup) state.setup = data.setup;
    if (data.setupPlayers) state.setup.players = data.setupPlayers;
    state.hole = data.hole || 1;
    state.activePlayer = data.activePlayer || 0;
    state.dataTier = data.dataTier || "score";
    state.scNine = data.scNine || "out";
    state.scCard = data.scCard === "net" || data.scCard === "stableford" ? data.scCard : "gross";
    state.editingRoundId = data.editingRoundId || null;
    PLAYERS.length = 0;
    data.players.forEach(p => {
      PLAYERS.push({
        id: p.id, rp: "rp-" + p.id, name: p.name,
        short: p.short || (p.name || "?").slice(0, 3),
        initials: p.initials || (p.name || "?").slice(0, 2).toUpperCase(),
        hcp: p.hcp, ch: p.ch, ph: p.ph, guest: !!p.guest,
        ball: (p.ball || "").toString(),
        withdrawn: !!p.withdrawn,
        avatar: "", scores: p.scores || {}, putts: p.putts || {},
        fir: p.fir || {}, gir: p.gir || {},
        totalsGross: (p.totalsGross != null ? Number(p.totalsGross) : null),
        totalsPutts: (p.totalsPutts != null ? Number(p.totalsPutts) : null),
        creativePts: Number(p.creativePts) || 0,
        creativeLog: Array.isArray(p.creativeLog) ? p.creativeLog.slice() : []
      });
    });
    if (state.setup && state.setup.courseId && typeof COURSES !== "undefined" && COURSES) {
      const course = COURSES.find(c => c.id === state.setup.courseId);
      if (course) {
        assignClub(course.name);
        const teeNames = (course.tees || []).map(x => x.name);
        let tee = state.setup.tee;
        if (!tee || !teeNames.includes(tee)) {
          tee = teeNames.includes("Amarillas") ? "Amarillas" : (teeNames[0] || tee);
        }
        state.setup.tee = tee;
        FX.tee = tee;
        assignHoles(pageFn("holesForTee")
          ? callPage("holesForTee", [course, tee])
          : course.holes.map(h => ({
              n: h.n, par: h.par, hcp: h.hcp,
              m: (h.mByTee && h.mByTee[tee] != null) ? h.mByTee[tee] : (h.m || 0)
            })));
      }
    }
    state._activeRoundLive = true;
    if (pageFn("refreshPlayerHandicaps")) callPage("refreshPlayerHandicaps");
    if (pageFn("updateClubCalls")) callPage("updateClubCalls");
    return true;
  }

  function restoreActiveRound() {
    sync();
    try {
      const primary = inspectActiveKey(ACTIVE_KEY);
      let data = primary.status === "ok" ? primary.data : null;
      let fromBak = false;
      if (!data) {
        const bak = inspectActiveKey(ACTIVE_BAK_KEY);
        if (bak.status !== "ok") return false;
        data = bak.data;
        fromBak = true;
      }
      if (!applyActivePayload(data)) return false;
      if (fromBak) {
        const wrote = storageSetItem(ACTIVE_KEY, JSON.stringify(data), "No se pudo guardar la ronda recuperada");
        if (wrote && pageFn("showToast")) callPage("showToast", ["Ronda recuperada de la copia local"]);
      }
      return true;
    } catch (e) {
      console.warn("restoreActiveRound", e);
      return false;
    }
  }

  function recoverActiveRoundFromBackup() {
    sync();
    const bak = inspectActiveKey(ACTIVE_BAK_KEY);
    if (bak.status !== "ok") {
      if (pageFn("showToast")) callPage("showToast", ["No hay copia local de la ronda"]);
      return false;
    }
    state._roundSaved = null;
    state._newRoundArmed = false;
    if (!applyActivePayload(bak.data)) {
      if (pageFn("showToast")) callPage("showToast", ["No se pudo recuperar la ronda"]);
      return false;
    }
    const wrote = storageSetItem(ACTIVE_KEY, JSON.stringify(bak.data), "No se pudo guardar la ronda recuperada");
    if (wrote && pageFn("showToast")) callPage("showToast", ["Ronda recuperada de la copia local"]);
    if (pageFn("updateHomeThru")) callPage("updateHomeThru");
    return true;
  }

  function flushActiveRoundForLifecycle() {
    sync();
    try {
      if (!state || state._newRoundArmed || state._roundSaved || !state._activeRoundLive) return;
      persistActiveRound();
    } catch (e) {
      console.warn("flushActiveRoundForLifecycle", e);
    }
  }

  function bindActiveRoundLifecycle() {
    sync();
    if (lifecycleBound) return;
    lifecycleBound = true;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushActiveRoundForLifecycle();
      else flushActiveStorageError();
    });
    window.addEventListener("pagehide", flushActiveRoundForLifecycle, true);
    window.addEventListener("beforeunload", flushActiveRoundForLifecycle);
    document.addEventListener("freeze", flushActiveRoundForLifecycle);
  }

  function buildRoundRecord() {
    sync();
    const { rows, mods } = callPage("liveStandings");
    const me = rows.find(r => r.me) || rows[0];
    const course = pageFn("getSelectedCourse") ? callPage("getSelectedCourse") : null;
    const now = new Date();
    const id = "r-" + now.getTime();
    const winners = (pageFn("buildLivePodium") ? callPage("buildLivePodium") : []).slice();
    const playersSnap = snapshotPlayers();
    function playerExtras(pSnap, row) {
      const scores = pSnap.scores || {};
      const putts = pSnap.putts || {};
      const fir = pSnap.fir || {};
      const gir = pSnap.gir || {};
      let puttSum = 0, puttN = 0, firHit = 0, firAtt = 0, girYes = 0, girAtt = 0;
      Object.keys(scores).forEach(k => {
        const hole = (typeof HOLES !== "undefined" && HOLES) ? HOLES[Number(k) - 1] : null;
        const par3 = hole && Number(hole.par) === 3;
        if (putts[k] != null) { puttSum += Number(putts[k]) || 0; puttN++; }
        if (!par3 && (fir[k] === "hit" || fir[k] === "miss")) { firAtt++; if (fir[k] === "hit") firHit++; }
        if (gir[k] === "yes" || gir[k] === "no") { girAtt++; if (gir[k] === "yes") girYes++; }
      });
      return {
        name: row ? row.name : pSnap.name,
        gross: row ? row.gross : null,
        net: row ? row.net : null,
        toPar: row ? row.toPar : null,
        sf: row ? row.sf : null,
        thru: row ? row.thru : null,
        ch: row ? row.ch : pSnap.ch,
        strokesUsed: row ? row.strokesUsed : null,
        puttsTotal: puttN ? puttSum : null,
        puttsHoles: puttN,
        birdies: row ? row.birdies : null,
        puttPts: row ? row.puttPts : null,
        holeWins: row ? row.holeWins : null,
        firHit, firAtt,
        girYes, girAtt,
        firPct: firAtt ? Math.round(100 * firHit / firAtt) : null,
        girPct: girAtt ? Math.round(100 * girYes / girAtt) : null
      };
    }
    const meSnap = playersSnap.find(p => me && ((me.p && p.id === me.p.id) || p.name === me.name)) || playersSnap[0];
    return {
      id,
      dateISO: now.toISOString(),
      updatedAt: now.toISOString(),
      date: formatRoundDate(now.toISOString()),
      club: (course && course.name) || CLUB || "Fairway",
      courseId: state.setup.courseId,
      layout: (pageFn("roundLayoutLabel") ? callPage("roundLayoutLabel") : (((state.setup && state.setup.holes) || 18) + " hoyos")),
      tee: state.setup.tee,
      par: (course && course.par) || 72,
      holes: state.setup.holes || 18,
      holesPlayed: meSnap ? callPage("countMarkedHoles", [meSnap.scores, state.setup.holes || 18]) : 0,
      modalities: (state.setup.modalities || []).slice(),
      creative: callPage("creativeEnabled") ? JSON.parse(JSON.stringify(callPage("ensureCreativeSetup"))) : null,
      official: !!(course && course.official),
      players: playersSnap, // scores + putts + fir + gir por hoyo
      me: me ? playerExtras(meSnap || {}, me) : null,
      winners,
      standings: rows.map(r => {
        const snap = playersSnap.find(p => (r.p && p.id === r.p.id) || p.name === r.name) || {};
        return playerExtras(snap, r);
      })
    };
  }

  function persistCompletedRound() {
    sync();
    // Always wipe activeRound even if already saved (P05: stale Continuar)
    if (state._roundSaved) {
      endActiveRoundMemory();
      if (pageFn("queueDriveSync")) callPage("queueDriveSync", [{ immediate: true }]);
      return state._roundSaved;
    }
    const { rows } = callPage("liveStandings");
    const any = rows.some(r => r.thru > 0) || PLAYERS.some(p =>
      Object.keys(p.scores || {}).length || p.totalsGross != null
    );
    if (!any) {
      endActiveRoundMemory();
      state.editingRoundId = null;
      if (pageFn("queueDriveSync")) callPage("queueDriveSync", [{ immediate: true }]);
      return null;
    }
    const rec = buildRoundRecord();
    const list = loadRounds();
    if (_roundsUnreadable) {
      if (pageFn("showToast")) callPage("showToast", ["No se pudo guardar el historial. La ronda sigue en este móvil."]);
      return null;
    }
    if (state.editingRoundId) {
      const idx = list.findIndex(r => r.id === state.editingRoundId);
      if (idx >= 0) {
        const prev = list[idx];
        rec.id = prev.id;
        rec.dateISO = prev.dateISO || rec.dateISO;
        rec.date = prev.date || rec.date;
        list[idx] = rec;
        if (saveRounds(list.slice(0, ROUNDS_MAX)) !== true) {
          if (pageFn("showToast")) callPage("showToast", ["No se pudo guardar el historial. La ronda sigue en este móvil."]);
          return null;
        }
        state._roundSaved = rec.id;
        state.editingRoundId = null;
        endActiveRoundMemory();
        if (pageFn("queueDriveSync")) callPage("queueDriveSync", [{ immediate: true }]);
        return rec.id;
      }
    }
    list.unshift(rec);
    if (saveRounds(list.slice(0, ROUNDS_MAX)) !== true) {
      if (pageFn("showToast")) callPage("showToast", ["No se pudo guardar el historial. La ronda sigue en este móvil."]);
      return null;
    }
    state._roundSaved = rec.id;
    state.editingRoundId = null;
    endActiveRoundMemory();
    if (pageFn("queueDriveSync")) callPage("queueDriveSync", [{ immediate: true }]);
    return rec.id;
  }

  function getRoundById(id) {
    sync();
    return loadRounds().find(r => r.id === id) || null;
  }

  function deleteSavedRound(id) {
    sync();
    saveRounds(loadRounds().filter(r => r.id !== id));
    state.deletedRounds[id] = true;
  }

  /** Carga una vuelta del historial para ver/editar la tarjeta y el marcador */
  function reopenRound(id, dest) {
    sync();
    const d = getRoundById(id);
    if (!d || !d.players || !d.players.length) {
      callPage("showToast", ["Sin partida", true]);
      return false;
    }
    if (isRoundInProgress() && state.editingRoundId !== id) {
      callPage("showToast", ["Cierra antes la partida en curso", true]);
      return false;
    }
    state._roundSaved = null;
    state.editingRoundId = id;
    state.setup = Object.assign({}, state.setup, {
      courseId: d.courseId || state.setup.courseId,
      tee: d.tee || state.setup.tee,
      holes: d.holes || state.setup.holes || 18,
      modalities: Array.isArray(d.modalities) ? d.modalities.slice() : (state.setup.modalities || []).slice(),
      creative: d.creative ? JSON.parse(JSON.stringify(d.creative)) : state.setup.creative
    });
    if (d.courseId) {
      const course = COURSES.find(c => c.id === d.courseId);
      if (course) callPage("applyCourseData", [course, d.tee || state.setup.tee, false]);
    }
    PLAYERS.length = 0;
    d.players.forEach(p => {
      PLAYERS.push({
        id: p.id || ("p" + Date.now() + Math.random().toString(16).slice(2, 6)),
        rp: "rp-" + (p.id || "x"),
        name: (p.name || "").toString(),
        short: p.short || (p.name || "?").slice(0, 3),
        initials: p.initials || callPage("guestInitials", [p.name || "?"]),
        hcp: p.hcp, ch: p.ch, ph: p.ph, guest: !!p.guest,
        ball: (p.ball || "").toString(),
        withdrawn: !!p.withdrawn,
        avatar: "",
        scores: Object.assign({}, p.scores || {}),
        putts: Object.assign({}, p.putts || {}),
        fir: Object.assign({}, p.fir || {}),
        gir: Object.assign({}, p.gir || {}),
        totalsGross: (p.totalsGross != null ? Number(p.totalsGross) : null),
        totalsPutts: (p.totalsPutts != null ? Number(p.totalsPutts) : null),
        creativePts: Number(p.creativePts) || 0,
        creativeLog: Array.isArray(p.creativeLog) ? p.creativeLog.slice() : []
      });
    });
    state.setup.players = PLAYERS.map(() => true);
    state.hole = 1;
    for (let i = (state.setup.holes || 18); i >= 1; i--) {
      if (PLAYERS.some(p => p.scores && p.scores[i] != null)) { state.hole = i; break; }
    }
    state.activePlayer = 0;
    state.scNine = state.hole > 9 ? "in" : "out";
    // setup.holes is already restored. refreshPlayerHandicaps must run after that,
    // or a 9-hole round becomes course handicap 11.
    if (pageFn("refreshPlayerHandicaps")) callPage("refreshPlayerHandicaps");
    if (pageFn("updateClubCalls")) callPage("updateClubCalls");
    persistActiveRound();
    callPage("updateHomeThru");
    callPage("showToast", ["Partida cargada · puedes editar"]);
    callPage("go", [dest === "scorecard" ? "scorecard" : "hole"]);
    return true;
  }

  function saveEditingRoundDraft(silent) {
    sync();
    if (!state.editingRoundId) {
      if (persistActiveRound() && !silent) callPage("showToast", ["Progreso guardado"]);
      return;
    }
    const list = loadRounds();
    const idx = list.findIndex(r => r.id === state.editingRoundId);
    if (idx < 0) {
      if (persistActiveRound() && !silent) callPage("showToast", ["Progreso guardado"]);
      return;
    }
    const rec = buildRoundRecord();
    const prev = list[idx];
    rec.id = prev.id;
    rec.dateISO = prev.dateISO || rec.dateISO;
    rec.date = prev.date || rec.date;
    list[idx] = rec;
    saveRounds(list);
    if (persistActiveRound() && !silent) callPage("showToast", ["Cambios guardados en el historial"]);
  }

  return {
    hasStoredActiveRound: hasStoredActiveRound,
    playerHasMarks: playerHasMarks,
    isRoundInProgress: isRoundInProgress,
    readRoundList: readRoundList,
    loadRounds: loadRounds,
    saveRounds: saveRounds,
    formatRoundDate: formatRoundDate,
    snapshotPlayers: snapshotPlayers,
    inspectActiveRaw: inspectActiveRaw,
    inspectActiveKey: inspectActiveKey,
    noteActiveStorageError: noteActiveStorageError,
    flushActiveStorageError: flushActiveStorageError,
    storageSetItem: storageSetItem,
    activeBackupNeedsRecovery: activeBackupNeedsRecovery,
    roundWouldBeReplaced: roundWouldBeReplaced,
    localActiveRoundIsProtected: localActiveRoundIsProtected,
    commitActiveScore: commitActiveScore,
    adjustActiveScore: adjustActiveScore,
    commitActivePutts: commitActivePutts,
    adjustActivePutts: adjustActivePutts,
    commitActiveMark: commitActiveMark,
    commitActiveTotal: commitActiveTotal,
    writeStoredActiveRound: writeStoredActiveRound,
    persistActiveRound: persistActiveRound,
    clearActiveRound: clearActiveRound,
    endActiveRoundMemory: endActiveRoundMemory,
    applyActivePayload: applyActivePayload,
    restoreActiveRound: restoreActiveRound,
    recoverActiveRoundFromBackup: recoverActiveRoundFromBackup,
    flushActiveRoundForLifecycle: flushActiveRoundForLifecycle,
    bindActiveRoundLifecycle: bindActiveRoundLifecycle,
    buildRoundRecord: buildRoundRecord,
    persistCompletedRound: persistCompletedRound,
    getRoundById: getRoundById,
    deleteSavedRound: deleteSavedRound,
    reopenRound: reopenRound,
    saveEditingRoundDraft: saveEditingRoundDraft
  };
}

export function bindRoundsScope(scope) {
  return createApi(scope || {});
}
