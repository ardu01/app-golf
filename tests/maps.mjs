import assert from "assert";
import { readFileSync, existsSync, readdirSync } from "fs";
import { readApp } from "./extract.mjs";

const root = new URL("..", import.meta.url);
const html = readApp();
const courses = JSON.parse(html.match(/let COURSES = (\[.*?\]);/)[1]);

assert.strictEqual(courses.length, 54);

const byLayout = {};
for (const c of courses) byLayout[c.layout] = (byLayout[c.layout] || 0) + 1;
assert.strictEqual(byLayout["18 hoyos"], 25);
assert.strictEqual(byLayout["9 hoyos"], 7);
assert.strictEqual(byLayout["Pitch & Putt"], 18);
assert.strictEqual(byLayout["Pares 3"], 4);

assert.ok(!existsSync(new URL("holes", root)), "la carpeta holes/ no debe publicarse");
assert.ok(!existsSync(new URL("docs/recorrido/mapas", root)));
assert.ok(!existsSync(new URL("docs/recorrido/videos/mapas-las-rozas.mp4", root)));
assert.ok(!html.includes("HOLE_MAP_COURSES"));
assert.ok(!html.includes("COURSE_GEO"));
assert.ok(!html.includes("holeFoto"));
assert.ok(!html.includes("setHoleTab"));
assert.ok(!html.includes(">Mapa<"));
assert.ok(!html.includes("ign.es"));
assert.ok(!html.includes("holes/"));
assert.ok(html.includes('id="holePlayPane"'));
assert.ok(html.includes('id="holeJumpBtn"'));
assert.ok(html.includes('id="holeCallCaddie"'));
assert.ok(html.includes("tel:+34918905111"));

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(sw.includes('const SHELL = "fairway-v4-414"'));
assert.ok(sw.includes("escorial-monasterio.png"));
assert.ok(existsSync(new URL("icons/escorial-monasterio.png", root)));
assert.ok(!sw.includes("fairway-maps"));
assert.ok(!sw.includes("/holes/"));
assert.ok(!sw.includes("migrateHoleMaps"));
const installPart = sw.split("activate")[0];
assert.ok(!installPart.includes("skipWaiting"));

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
assert.ok(!readme.includes("docs/recorrido/mapas/"));
assert.ok(!readme.includes("mapas-las-rozas.mp4"));

const workflows = readdirSync(new URL("../.github/workflows/", import.meta.url));
assert.deepStrictEqual(workflows, ["test-fairway.yml"]);

console.log("maps ok", { courses: courses.length, perHole: 0, overview: 0, images: 0 });
