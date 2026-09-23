import assert from "assert";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { readApp } from "./extract.mjs";

const root = new URL("..", import.meta.url);
const html = readApp();
const courses = JSON.parse(html.match(/let COURSES = (\[.*?\]);/)[1]);
const block = html.match(/const HOLE_MAP_COURSES = Object\.freeze\(\{([\s\S]*?)\}\);/)[1];
const entries = [...block.matchAll(/"([^"]+)": \{ dir: "([^"]+)"(,\s*overviewOnly:\s*true)?/g)];

assert.strictEqual(courses.length, 54);
assert.strictEqual(entries.length, 26);

const byLayout = {};
for (const c of courses) byLayout[c.layout] = (byLayout[c.layout] || 0) + 1;
assert.strictEqual(byLayout["18 hoyos"], 25);
assert.strictEqual(byLayout["9 hoyos"], 7);
assert.strictEqual(byLayout["Pitch & Putt"], 18);
assert.strictEqual(byLayout["Pares 3"], 4);

const registered = new Set();
let perHole = 0;
let overview = 0;
let images = 0;
const noManifestOk = new Set(["rshecc-norte", "rshecc-sur", "el-robledal"]);

for (const [, id, dir, ovFlag] of entries) {
  assert.ok(courses.some(c => c.id === id), "campo sin ficha " + id);
  assert.ok(existsSync(new URL(dir, root)), "falta carpeta " + dir);
  registered.add(dir.split("/").pop());
  const folder = new URL(dir + "/", root);
  const files = readdirSync(folder);
  const pics = files.filter(f => /\.(webp|png|jpe?g)$/i.test(f));
  images += pics.length;
  if (ovFlag) {
    overview++;
    assert.ok(pics.some(f => /^overview\.(webp|png|jpe?g)$/i.test(f)), "sin overview " + id);
  } else {
    perHole++;
    const numbered = pics.filter(f => /^\d{2}\.(webp|png|jpe?g)$/i.test(f)).map(f => f.slice(0, 2));
    if (files.includes("manifest.json")) {
      const raw = JSON.parse(readFileSync(new URL(dir + "/manifest.json", root), "utf8"));
      const holes = Array.isArray(raw) ? raw : (Array.isArray(raw.holes) ? raw.holes : (raw.n ? [raw] : Object.values(raw)));
      assert.ok(holes.length >= 9, "manifest corto " + id);
      for (const h of holes) {
        const src = h.src || h.file || h.img || h.path;
        if (!src) continue;
        const rel = src.startsWith("holes/") ? src : dir + "/" + src.replace(/^\.\//, "");
        assert.ok(existsSync(new URL(rel, root)), id + " apunta a " + src);
      }
    } else {
      assert.ok(noManifestOk.has(id), "manifest ausente " + id);
      for (let n = 1; n <= 18; n++) {
        const name = String(n).padStart(2, "0");
        assert.ok(numbered.includes(name), id + " sin " + name);
      }
    }
  }
}

assert.strictEqual(perHole, 22);
assert.strictEqual(overview, 4);
assert.strictEqual(images, 404);

const folders = readdirSync(new URL("holes/", root)).filter(name => {
  return statSync(new URL("holes/" + name, root)).isDirectory();
});
const orphans = folders.filter(name => !registered.has(name));
assert.deepStrictEqual(orphans, []);
assert.ok(!folders.includes("forus-golf-las-rejas-pares-3"));
assert.ok(existsSync(new URL("holes/forus-las-rejas-pares-3/overview.webp", root)));

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(sw.includes('const SHELL = "fairway-v3-194"'));
assert.ok(sw.includes("escorial-monasterio.png"));
assert.ok(existsSync(new URL("icons/escorial-monasterio.png", root)));
assert.ok(sw.includes('const MAPS = "fairway-maps-v1"'));
assert.ok(sw.includes("MAPS_MAX = 120"));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));
assert.ok(sw.includes("migrateHoleMaps"));

console.log("maps ok", { courses: courses.length, perHole, overview, images });
