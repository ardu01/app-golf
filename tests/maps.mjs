import assert from "assert";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { extractFunction, readApp } from "./extract.mjs";

const root = new URL("..", import.meta.url);
const html = readApp();
const coursesSrc = readFileSync(new URL("../fairway/js/courses.js", import.meta.url), "utf8");
const courses = JSON.parse(coursesSrc.match(/let COURSES = (\[.*?\]);/)[1]);
assert.ok(html.includes('src="fairway/js/courses.js"'));
assert.ok(!html.includes("let COURSES = ["));
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
const noManifestOk = new Set();
const fileOnlyManifest = new Set(["rshecc-norte", "rshecc-sur", "el-robledal"]);

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
      if (fileOnlyManifest.has(id)) {
        assert.strictEqual(holes.length, 18, id);
        for (const h of holes) {
          assert.ok(!("name" in h), id + " no inventa nombre");
          assert.ok(!/overview/i.test(String(h.file || "")), id + " no lista overview como hoyo");
        }
      }
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
assert.ok(sw.includes('const SHELL = "fairway-v5-512"'));
assert.ok(sw.includes("./fairway/js/courses.js"));
assert.ok(sw.includes("./fairway/css/fairway.css"));
assert.ok(sw.includes("escorial-monasterio.png"));
assert.ok(existsSync(new URL("icons/escorial-monasterio.png", root)));
assert.ok(sw.includes('const MAPS = "fairway-maps-v1"'));
assert.ok(sw.includes("MAPS_MAX = 120"));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));
assert.ok(sw.includes("migrateHoleMaps"));
const assetsBlock = sw.slice(sw.indexOf("const ASSETS"), sw.indexOf("];", sw.indexOf("const ASSETS")) + 2);
assert.ok(!assetsBlock.includes("escorial-monasterio.png"));
assert.ok(!/^\s*loadEscorialMonastery\(\);\s*$/m.test(html));
const escorialCalls = html.match(/loadEscorialMonastery\s*\(/g) || [];
assert.strictEqual(escorialCalls.length, 3);
const shareOne = extractFunction(html, "shareWinnerPlaque");
const shareAll = extractFunction(html, "shareAllWinnerPlaques");
assert.ok(shareOne.indexOf("await loadEscorialMonastery()") < shareOne.indexOf("drawWinnerPlaque("));
assert.ok(shareOne.includes("plaqueIsHerreria(meta)"));
assert.ok(shareAll.indexOf("await loadEscorialMonastery()") < shareAll.indexOf("drawWinnerPlaquesSheet("));
assert.ok(shareAll.includes("plaqueIsHerreria(meta)"));

const setupNext = extractFunction(html, "setupNext");
const savedAt = setupNext.indexOf("persistActiveRound()");
const preloadAt = setupNext.indexOf("preloadCourseHoleMaps(state.setup && state.setup.courseId)");
const goAt = setupNext.lastIndexOf('go("hole")');
assert.ok(savedAt > 0 && preloadAt > savedAt && goAt > preloadAt);
assert.ok(!extractFunction(html, "setupStart").includes("preloadCourseHoleMaps"));

const created = [];
globalThis.Image = class HolePreloadImage {
  set src(value) { created.push(value); this._src = value; }
  get src() { return this._src; }
};
const preloadCourseHoleMaps = new Function(
  html.match(/const HOLE_MAP_COURSES = Object\.freeze\(\{[\s\S]*?\}\);/)[0] + "\n" +
  extractFunction(html, "holeMapConfig") + "\n" +
  extractFunction(html, "holeMapRequestUrl") + "\n" +
  extractFunction(html, "courseHolePreloadList") + "\n" +
  extractFunction(html, "preloadCourseHoleMaps") + "\n" +
  "return preloadCourseHoleMaps;"
)();

function assertCourseOnly(id, urls) {
  assert.ok(urls.length > 0 && urls.length <= 18, id + " " + urls.length);
  assert.ok(urls.every(u => u.startsWith("holes/" + id + "/")), id);
  assert.ok(!urls.some(u => u.includes("manifest")), id);
  const others = urls.filter(u => !u.startsWith("holes/" + id + "/"));
  assert.deepStrictEqual(others, []);
}

created.length = 0;
const herreria = preloadCourseHoleMaps("la-herreria");
assert.strictEqual(herreria.length, 18);
assertCourseOnly("la-herreria", herreria);
assert.deepStrictEqual(created, herreria);
assert.ok(herreria.every(u => /\/\d{2}\.webp\?v=3$/.test(u)));
assert.ok(!herreria.some(u => u.includes("overview")));

created.length = 0;
const cng = preloadCourseHoleMaps("centro-nacional-de-golf");
assertCourseOnly("centro-nacional-de-golf", cng);
assert.strictEqual(cng.length, 18);
assert.ok(!cng.some(u => u.includes("la-herreria") || u.includes("overview")));
assert.deepStrictEqual(created, cng);

created.length = 0;
const overviewUrls = preloadCourseHoleMaps("forus-las-rejas-pares-3");
assert.deepStrictEqual(overviewUrls, ["holes/forus-las-rejas-pares-3/overview.webp?v=3"]);
assert.deepStrictEqual(created, overviewUrls);

created.length = 0;
assert.deepStrictEqual(preloadCourseHoleMaps("villa-el-escorial"), []);
assert.deepStrictEqual(created, []);
assert.deepStrictEqual(preloadCourseHoleMaps(""), []);

for (const [, id] of entries) {
  created.length = 0;
  const urls = preloadCourseHoleMaps(id);
  assertCourseOnly(id, urls);
  assert.deepStrictEqual(created, urls);
  assert.ok(urls.every(u => u.indexOf("holes/") === 0 && u.split("/").length === 3), id);
}

delete globalThis.Image;

console.log("maps ok", { courses: courses.length, perHole, overview, images });
