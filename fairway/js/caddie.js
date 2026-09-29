/** Bag and hole-card facts. Distances come only from the existing hole card. */

export const BAG_KEY = "fairway.bag.v1";

export function holeCardFact(hole) {
  if (!hole || typeof hole !== "object") return { par: null, si: null, meters: null };
  const par = Number(hole.par);
  const si = Number(hole.hcp);
  const meters = Number(hole.m);
  return {
    par: Number.isFinite(par) ? par : null,
    si: Number.isFinite(si) ? si : null,
    meters: Number.isFinite(meters) ? meters : null
  };
}

export function bagNames(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const source = item && typeof item === "object" ? item.name : item;
    const name = String(source == null ? "" : source).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    out.push(name.slice(0, 40));
    if (out.length >= 14) break;
  }
  return out;
}

export function caddieCard(hole, bag) {
  const fact = holeCardFact(hole);
  const clubs = bagNames(bag);
  const bits = [];
  if (fact.par != null) bits.push("Par " + fact.par);
  if (fact.si != null) bits.push("SI " + fact.si);
  if (fact.meters != null) bits.push(fact.meters + " m");
  return {
    factLine: bits.join(" · "),
    clubs: clubs,
    meters: fact.meters
  };
}

if (typeof window !== "undefined") {
  window.fairwayCaddie = {
    BAG_KEY: BAG_KEY,
    holeCardFact: holeCardFact,
    bagNames: bagNames,
    caddieCard: caddieCard
  };
}
