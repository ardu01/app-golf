/**
 * Live scoring from index.html (Fairway 4.2.6, main 56a2662).
 * The function bodies are the page formulas. scope is read on every call
 * so a later HOLES reassignment in the classic script stays visible.
 * state, PLAYERS, HOLES, FX, getSelectedCourse and recalculateAllCreativePts
 * are not copied into this file.
 */
let current = null;

function createApi(scope) {
  scope = scope || {};
  let state;
  let PLAYERS;
  let HOLES;
  let FX;
  let getSelectedCourse;
  let recalculateAllCreativePts;

  function sync() {
    state = scope.state;
    PLAYERS = scope.PLAYERS;
    HOLES = scope.HOLES;
    FX = scope.FX;
    getSelectedCourse = scope.getSelectedCourse;
    recalculateAllCreativePts = scope.recalculateAllCreativePts;
  }

  function publish(fn) {
    return function () {
      sync();
      return fn.apply(this, arguments);
    };
  }

function stablefordHole(score, par, strokesReceived) {
  const netDiff = score - par - strokesReceived;
  if (netDiff <= -3) return 5;
  if (netDiff === -2) return 4;
  if (netDiff === -1) return 3;
  if (netDiff === 0) return 2;
  if (netDiff === 1) return 1;
  return 0;
}

function holesInRound(explicit) {
  if (explicit != null && Number.isFinite(Number(explicit))) {
    return Math.max(1, Math.min(18, Math.floor(Number(explicit))));
  }
  const n = Number(state.setup && state.setup.holes);
  return Math.max(1, Math.min(18, Number.isFinite(n) ? n : 18));
}

function scaleHandicapForRound(ch18, nHoles, courseHoleCount) {
  const n = holesInRound(nHoles);
  const total = courseHoleCount != null
    ? Number(courseHoleCount)
    : ((typeof HOLES !== "undefined" && HOLES.length) ? HOLES.length : 18);
  if (n <= 9 && total > 9) return Math.round(Number(ch18) / 2);
  return Math.round(Number(ch18)) || 0;
}

function resolveSetupTee(course) {
  const c = course || (typeof getSelectedCourse === "function" ? getSelectedCourse() : null);
  if (!c || !c.tees || !c.tees.length) return (state.setup && state.setup.tee) || "Amarillas";
  const names = c.tees.map(x => x.name);
  let tee = (state.setup && state.setup.tee) || FX.tee;
  if (!tee || !names.includes(tee)) {
    tee = names.includes("Amarillas") ? "Amarillas" : names[0];
  }
  return tee;
}

function courseHandicapFor(player, opts) {
  opts = opts || {};
  const hi = Number(player && player.hcp);
  if (!Number.isFinite(hi)) return 0;
  const course = opts.course || (typeof getSelectedCourse === "function" ? getSelectedCourse() : null);
  const teeName = opts.tee || resolveSetupTee(course);
  const tee = course && course.tees && course.tees.find(x => x.name === teeName);
  const nHoles = opts.holes != null ? opts.holes : holesInRound();
  const courseHoleCount = (course && course.holes && course.holes.length)
    || (typeof HOLES !== "undefined" ? HOLES.length : 18);
  if (!tee || tee.slope == null || tee.cr == null) {
    return scaleHandicapForRound(Math.round(hi), nHoles, courseHoleCount);
  }
  const par = (tee.par != null ? tee.par : course.par) || 72;
  const ch18 = Math.round(hi * (Number(tee.slope) / 113) + (Number(tee.cr) - Number(par)));
  return scaleHandicapForRound(ch18, nHoles, courseHoleCount);
}

function playerCourseHcp(p) {
  if (p && p.ch != null && Number.isFinite(Number(p.ch))) return Number(p.ch);
  if (p && p.ph != null && Number.isFinite(Number(p.ph))) return Number(p.ph);
  return typeof courseHandicapFor === "function" ? courseHandicapFor(p) : 0;
}

function relativeStrokeIndex(holeHcp, nHoles, holeList) {
  const n = holesInRound(nHoles);
  const abs = Number(holeHcp);
  const si = Number.isFinite(abs) ? abs : n;
  const list = holeList || (typeof HOLES !== "undefined" ? HOLES : null);
  if (!list || !list.length || n >= 18 || n >= list.length) return si;
  const played = list.slice(0, n);
  const ranked = played
    .map((h, i) => ({ si: Number(h.hcp) || 99, n: h.n || (i + 1) }))
    .sort((a, b) => (a.si - b.si) || (a.n - b.n));
  const pos = ranked.findIndex(x => x.si === si);
  return pos >= 0 ? (pos + 1) : si;
}

function strokesOnHole(ph, holeHcp, opts) {
  opts = opts || {};
  const chRaw = Number(ph);
  if (!Number.isFinite(chRaw) || chRaw === 0) return 0;
  const ch = chRaw < 0 ? Math.ceil(chRaw) : Math.floor(chRaw);
  if (ch === 0) return 0;
  const nHoles = holesInRound(opts.holes);
  const idx = relativeStrokeIndex(holeHcp, nHoles, opts.holeList);
  if (ch > 0) {
    let n = 0;
    for (let k = 0; k * nHoles < ch; k++) {
      if (idx <= (ch - k * nHoles)) n += 1;
    }
    return n;
  }
  // Plus handicap: give strokes on easiest holes (highest relative SI)
  const give = -ch;
  let n = 0;
  for (let k = 0; k * nHoles < give; k++) {
    const band = Math.min(give - k * nHoles, nHoles);
    if (idx >= (nHoles - band + 1)) n -= 1;
  }
  return n;
}

function modeRankCmp(id) {
  return function (a, b) {
    if (!a.thru && b.thru) return 1;
    if (a.thru && !b.thru) return -1;
    if (id === "stroke") return (a.net - b.net) || (a.gross - b.gross) || String(a.name).localeCompare(String(b.name));
    if (id === "stableford") return (b.sf - a.sf) || (a.gross - b.gross) || String(a.name).localeCompare(String(b.name));
    if (id === "putting") return (b.puttPts - a.puttPts) || ((b.onePutts || 0) - (a.onePutts || 0)) || ((a.threePutts || 0) - (b.threePutts || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "gir") return ((b.girPts || 0) - (a.girPts || 0)) || ((b.girYes || 0) - (a.girYes || 0)) || ((b.girBirdies || 0) - (a.girBirdies || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "birdie") return ((b.birdiePts || 0) - (a.birdiePts || 0)) || ((b.eagleN || 0) - (a.eagleN || 0)) || ((b.birdieN || 0) - (a.birdieN || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "rey") return ((b.reyPts || 0) - (a.reyPts || 0)) || ((b.reyHoles || 0) - (a.reyHoles || 0)) || ((b.reyDefenses || 0) - (a.reyDefenses || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "chaos") return ((b.chaosPts || 0) - (a.chaosPts || 0)) || (a.gross - b.gross) || String(a.name).localeCompare(String(b.name));
    if (id === "brawl") return ((b.brawlPts || 0) - (a.brawlPts || 0)) || ((b.brawlWins || 0) - (a.brawlWins || 0)) || ((a.brawlGross || 0) - (b.brawlGross || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "last") return ((b.lastPts || 0) - (a.lastPts || 0)) || ((a.lastToPar || 0) - (b.lastToPar || 0)) || ((b.lastBirdies || 0) - (a.lastBirdies || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "nobogey") return ((b.noBogeyPts || 0) - (a.noBogeyPts || 0)) || ((b.bestClean || 0) - (a.bestClean || 0)) || ((a.doubles || 0) - (b.doubles || 0)) || String(a.name).localeCompare(String(b.name));
    if (id === "creative") return ((b.creativePts || 0) - (a.creativePts || 0)) || (a.gross - b.gross) || String(a.name).localeCompare(String(b.name));
    return 0;
  };
}

function modeTie(id, a, b) {
  const named = modeRankCmp(id)(Object.assign({}, a, { name: "" }), Object.assign({}, b, { name: "" }));
  return named === 0;
}

function activePlayers() {
  return PLAYERS.filter((p, i) => state.setup.players[i] && !p.withdrawn);
}

function plaqueIsHerreria(meta) {
  if (!meta) return false;
  if (meta.courseId === "la-herreria") return true;
  const club = String(meta.club || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return club.indexOf("la herreria") !== -1;
}

function playerGross(p, maxH) {
  let g = 0, thru = 0;
  for (let i = 1; i <= maxH; i++) {
    if (p.scores[i] != null) { g += p.scores[i]; thru = i; }
  }
  if (thru === 0 && p.totalsGross != null && Number.isFinite(Number(p.totalsGross))) {
    return { gross: Number(p.totalsGross), thru: maxH, totalsOnly: true };
  }
  return { gross: g, thru, totalsOnly: false };
}

function playerParPlayed(p, maxH) {
  let par = 0;
  let any = false;
  for (let i = 1; i <= maxH; i++) {
    if (p.scores[i] != null && HOLES[i - 1]) { par += HOLES[i - 1].par; any = true; }
  }
  if (!any && p.totalsGross != null) {
    for (let i = 1; i <= maxH; i++) {
      if (HOLES[i - 1]) par += HOLES[i - 1].par;
    }
  }
  return par;
}

function chaosSpin(seed, holeN) {
  let h = 2166136261;
  const s = String(seed || "fairway") + "#" + holeN;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bucket = (h >>> 0) % 10;
  if (bucket < 5) return "none";
  if (bucket < 7) return "angel";
  if (bucket < 9) return "snake";
  return "double";
}

function blankModeScore() {
  return {
    girPts: 0, girYes: 0, girBirdies: 0,
    birdiePts: 0, birdieN: 0, eagleN: 0,
    reyPts: 0, reyHoles: 0, reyDefenses: 0,
    chaosPts: 0,
    brawlPts: 0, brawlWins: 0, brawlGross: 0,
    lastPts: 0, lastToPar: 0, lastBirdies: 0,
    noBogeyPts: 0, bestClean: 0, doubles: 0,
    onePutts: 0, threePutts: 0
  };
}

function applyModeScores(players, holeMeta, maxH, seed, strokesFor) {
  const out = (players || []).map(() => blankModeScore());
  const clean = (players || []).map(() => 0);
  const lastFrom = Math.max(1, maxH - 2);
  let king = -1;
  for (let i = 1; i <= maxH; i++) {
    const h = holeMeta && holeMeta[i - 1];
    if (!h) continue;
    const scored = [];
    const gross = {};
    const netDiff = {};
    (players || []).forEach((p, pi) => {
      if (!p || !p.scores || p.scores[i] == null) return;
      scored.push(pi);
      const s = Number(p.scores[i]) || 0;
      const recv = strokesFor ? Number(strokesFor(p, h)) || 0 : 0;
      gross[pi] = s;
      netDiff[pi] = s - Number(h.par) - recv;
    });
    if (!scored.length) continue;
    const bestGross = Math.min.apply(null, scored.map(pi => gross[pi]));
    const holeWinners = scored.filter(pi => gross[pi] === bestGross);
    if (holeWinners.length === 1) {
      const pi = holeWinners[0];
      if (king === pi) {
        out[pi].reyPts += 3;
        out[pi].reyDefenses += 1;
      } else {
        out[pi].reyPts += 2;
        king = pi;
      }
      out[pi].reyHoles += 1;
    } else {
      holeWinners.forEach(pi => { out[pi].reyPts += 1; });
    }
    if (i >= 10) {
      if (holeWinners.length === 1) {
        out[holeWinners[0]].brawlPts += 3;
        out[holeWinners[0]].brawlWins += 1;
      } else {
        holeWinners.forEach(pi => { out[pi].brawlPts += 1; });
      }
    }
    if ((players || []).length >= 2) {
      const hunters = scored.filter(pi => netDiff[pi] <= -1);
      if (hunters.length) {
        const bestNet = Math.min.apply(null, hunters.map(pi => netDiff[pi]));
        const firsts = hunters.filter(pi => netDiff[pi] === bestNet);
        const bonus = firsts.length === 1 ? 2 : 1;
        firsts.forEach(pi => { out[pi].birdiePts += bonus; });
      }
    }
    scored.forEach(pi => {
      const p = players[pi];
      const o = out[pi];
      const s = gross[pi];
      const diff = s - Number(h.par);
      const gir = p.gir && p.gir[i];
      if (gir === "yes") {
        o.girYes += 1;
        if (diff <= -1) {
          o.girPts += 4;
          o.girBirdies += 1;
        } else o.girPts += 1;
      } else if (gir === "no" && diff >= 1) {
        o.girPts -= 1;
      }
      if (netDiff[pi] <= -2) {
        o.birdiePts += 10;
        o.eagleN += 1;
        o.birdieN += 1;
      } else if (netDiff[pi] === -1) {
        o.birdiePts += 5;
        o.birdieN += 1;
      }
      let chaos = 0;
      if (diff <= -1) chaos += 3;
      else if (diff === 1) chaos -= 1;
      else if (diff >= 2) chaos -= 3;
      const pt = p.putts && p.putts[i];
      if (pt != null && pt !== "") {
        const putt = Number(pt);
        if (putt === 1) {
          chaos += 3;
          o.onePutts += 1;
        } else if (putt === 2) chaos += 1;
        else if (putt >= 3) {
          chaos -= 1;
          o.threePutts += 1;
        }
      }
      if (gir === "yes") chaos += 1;
      const spin = chaosSpin(seed, i);
      if (spin === "angel") chaos += 3;
      else if (spin === "snake") chaos -= 3;
      else if (spin === "double") chaos *= 2;
      o.chaosPts += chaos;
      if (i >= lastFrom) {
        if (diff <= -1) {
          o.lastPts += 6;
          o.lastBirdies += 1;
        } else if (diff === 0) o.lastPts += 2;
        else if (diff === 1) o.lastPts -= 2;
        else o.lastPts -= 4;
        o.lastToPar += diff;
      }
      if (diff <= 0) {
        o.noBogeyPts += 2;
        clean[pi] += 1;
        if (clean[pi] > o.bestClean) o.bestClean = clean[pi];
        if (clean[pi] % 3 === 0) o.noBogeyPts += 3;
      } else {
        clean[pi] = 0;
        if (diff === 1) o.noBogeyPts -= 2;
        else {
          o.noBogeyPts -= 5;
          o.doubles += 1;
        }
      }
      if (i >= 10) {
        o.brawlGross += s;
        if (diff <= -1) o.brawlPts += 2;
      }
    });
  }
  return out;
}

function attachModeScores(rows, players, holeMeta, maxH, seed, strokesFor) {
  const scored = applyModeScores(players, holeMeta, maxH, seed, strokesFor);
  (rows || []).forEach((r, i) => Object.assign(r, scored[i] || blankModeScore()));
  return rows;
}

function liveStandings() {
  const maxH = state.setup.holes || 18;
  const list = activePlayers();
  const mods = state.setup.modalities || [];
  if (typeof recalculateAllCreativePts === "function") recalculateAllCreativePts();
  const rows = list.map(p => {
    const pg = playerGross(p, maxH);
    const { gross, thru } = pg;
    const totalsOnly = !!pg.totalsOnly;
    const parP = playerParPlayed(p, maxH);
    const ph = playerCourseHcp(p);
    let sf = 0, puttPts = 0, holeWins = 0, birdies = 0;
    let puttSum = 0, puttN = 0;
    for (let i = 1; i <= maxH; i++) {
      const h = HOLES[i - 1];
      if (!h) continue;
      const s = p.scores[i];
      if (s == null) continue;
      sf += stablefordHole(s, h.par, strokesOnHole(ph, h.hcp));
      const _recvB = strokesOnHole(ph, h.hcp);
      if ((s - _recvB) <= h.par - 1) birdies++;
      const pt = p.putts[i];
      if (pt != null) {
        puttSum += Number(pt) || 0;
        puttN++;
        if (pt === 1) puttPts += 3;
        else if (pt === 2) puttPts += 1;
        else if (pt >= 3) puttPts -= 1;
      }
    }
    for (let i = 1; i <= maxH; i++) {
      const scored = list.filter(q => q.scores[i] != null);
      if (!scored.length || p.scores[i] == null) continue;
      const best = Math.min(...scored.map(q => q.scores[i]));
      const winners = scored.filter(q => q.scores[i] === best);
      if (winners.length === 1 && winners[0] === p) holeWins += 2;
    }
    let strokesUsed = 0;
    if (totalsOnly) {
      // Total-only round: apply full course handicap as strokes
      strokesUsed = ph;
    } else {
      for (let i = 1; i <= maxH; i++) {
        const h = HOLES[i - 1];
        if (!h || p.scores[i] == null) continue;
        strokesUsed += strokesOnHole(ph, h.hcp);
      }
    }
    const net = thru ? (gross - strokesUsed) : null;
    const puttsTotal = puttN ? puttSum : (p.totalsPutts != null ? Number(p.totalsPutts) : null);
    return {
      p, name: p.name, initials: p.initials, avatar: p.avatar || "",
      guest: !!p.guest, me: p === list[0] || p.id === PLAYERS[0].id,
      gross, net, strokesUsed, thru, toPar: parP ? (gross - parP) : null,
      sf, puttPts, holeWins, birdies, ph, ch: ph,
      creativePts: Number(p.creativePts) || 0,
      puttsTotal, puttsHoles: puttN || (p.totalsPutts != null ? maxH : 0),
      totalsOnly
    };
  });
  // me = host Miguel if present else first active
  rows.forEach(r => { r.me = (r.p.id === PLAYERS[0].id); });
  attachModeScores(rows, list, HOLES, maxH, (state.setup && state.setup.courseId) || "fairway", function (p, h) {
    return strokesOnHole(playerCourseHcp(p), h.hcp);
  });
  return { rows, maxH, mods };
}

function pickWinner(rows, key, preferLow) {
  const pool = rows.filter(r => r.thru > 0 && r[key] != null && !Number.isNaN(r[key]));
  if (!pool.length) return null;
  pool.sort((a, b) => preferLow
    ? ((a[key] - b[key]) || (a.gross - b.gross) || a.name.localeCompare(b.name))
    : ((b[key] - a[key]) || (a.gross - b.gross) || a.name.localeCompare(b.name)));
  return pool[0];
}

  return {
    stablefordHole: publish(stablefordHole),
    holesInRound: publish(holesInRound),
    scaleHandicapForRound: publish(scaleHandicapForRound),
    resolveSetupTee: publish(resolveSetupTee),
    courseHandicapFor: publish(courseHandicapFor),
    playerCourseHcp: publish(playerCourseHcp),
    relativeStrokeIndex: publish(relativeStrokeIndex),
    strokesOnHole: publish(strokesOnHole),
    modeRankCmp: publish(modeRankCmp),
    modeTie: publish(modeTie),
    activePlayers: publish(activePlayers),
    plaqueIsHerreria: publish(plaqueIsHerreria),
    playerGross: publish(playerGross),
    playerParPlayed: publish(playerParPlayed),
    chaosSpin: publish(chaosSpin),
    blankModeScore: publish(blankModeScore),
    applyModeScores: publish(applyModeScores),
    attachModeScores: publish(attachModeScores),
    liveStandings: publish(liveStandings),
    pickWinner: publish(pickWinner)
  };
}

export function bindScoringScope(scope) {
  current = createApi(scope || {});
  return current;
}

function call(name, args) {
  if (!current) bindScoringScope({});
  return current[name].apply(current, args);
}

export function stablefordHole() {
  return call("stablefordHole", arguments);
}
export function holesInRound() {
  return call("holesInRound", arguments);
}
export function scaleHandicapForRound() {
  return call("scaleHandicapForRound", arguments);
}
export function resolveSetupTee() {
  return call("resolveSetupTee", arguments);
}
export function courseHandicapFor() {
  return call("courseHandicapFor", arguments);
}
export function playerCourseHcp() {
  return call("playerCourseHcp", arguments);
}
export function relativeStrokeIndex() {
  return call("relativeStrokeIndex", arguments);
}
export function strokesOnHole() {
  return call("strokesOnHole", arguments);
}
export function modeRankCmp() {
  return call("modeRankCmp", arguments);
}
export function modeTie() {
  return call("modeTie", arguments);
}
export function activePlayers() {
  return call("activePlayers", arguments);
}
export function plaqueIsHerreria() {
  return call("plaqueIsHerreria", arguments);
}
export function playerGross() {
  return call("playerGross", arguments);
}
export function playerParPlayed() {
  return call("playerParPlayed", arguments);
}
export function chaosSpin() {
  return call("chaosSpin", arguments);
}
export function blankModeScore() {
  return call("blankModeScore", arguments);
}
export function applyModeScores() {
  return call("applyModeScores", arguments);
}
export function attachModeScores() {
  return call("attachModeScores", arguments);
}
export function liveStandings() {
  return call("liveStandings", arguments);
}
export function pickWinner() {
  return call("pickWinner", arguments);
}
