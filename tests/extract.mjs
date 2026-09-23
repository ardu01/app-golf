import { readFileSync } from "fs";

export function readApp() {
  return readFileSync(new URL("../index.html", import.meta.url), "utf8");
}

export function extractFunction(source, name) {
  const re = new RegExp("function\\s+" + name + "\\s*\\(");
  const start = source.search(re);
  if (start < 0) throw new Error("No está la función " + name);
  let i = source.indexOf("{", start);
  if (i < 0) throw new Error("Sin cuerpo: " + name);
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === "*" && next === "/") { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && next === "/") { lineComment = true; i++; continue; }
    if (c === "/" && next === "*") { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Función sin cerrar: " + name);
}

export function extractBetween(source, startMark, endMark) {
  const a = source.indexOf(startMark);
  const b = source.indexOf(endMark);
  if (a < 0 || b < 0 || b <= a) throw new Error("Marcadores no encontrados");
  return source.slice(a, b);
}

export function loadFunctions(source, names, scope) {
  const code = names.map(n => extractFunction(source, n)).join("\n");
  const fn = new Function("scope", [
    "var state = scope.state;",
    "var PLAYERS = scope.PLAYERS;",
    "var HOLES = scope.HOLES;",
    "var FX = scope.FX;",
    "var getSelectedCourse = scope.getSelectedCourse;",
    code,
    "return {" + names.join(",") + "};"
  ].join("\n"));
  return fn(scope || {});
}
