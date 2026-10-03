import assert from "assert";
import { readFileSync } from "fs";
import { loadFunctions, readApp } from "./extract.mjs";
import { APP_VERSION, BACKUP_SCHEMA } from "../fairway/js/keys.js";

const html = readApp();
const api = loadFunctions(html, [
  "carouselSwipeMarkGesture",
  "carouselSnappedPlayerIndex",
  "carouselPlayerAfterSwipe"
]);

const track = { left: 0, width: 390 };
const atFirst = [
  { left: 12, width: 366 },
  { left: 388, width: 366 }
];
const atSecond = [
  { left: -354, width: 366 },
  { left: 12, width: 366 }
];
const atMiddle = [
  { left: -354, width: 366 },
  { left: 12, width: 366 },
  { left: 388, width: 366 }
];
const solo = [{ left: 10, width: 370 }];
const swipe = { user: true, start: 0, moved: true };

assert.strictEqual(api.carouselSnappedPlayerIndex(track, atFirst), 0);
assert.strictEqual(api.carouselSnappedPlayerIndex(track, atSecond), 1);
assert.strictEqual(api.carouselSnappedPlayerIndex(track, atMiddle), 1);
assert.strictEqual(api.carouselSnappedPlayerIndex(track, solo), null);
assert.strictEqual(api.carouselSnappedPlayerIndex(track, []), null);
assert.strictEqual(api.carouselSnappedPlayerIndex({ left: 0, width: 0 }, atSecond), null);
assert.strictEqual(api.carouselSnappedPlayerIndex(track, [{ left: 12, width: 0 }, { left: NaN, width: 366 }]), null);

assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, atSecond, swipe), 1);
assert.strictEqual(api.carouselPlayerAfterSwipe(1, track, atFirst, swipe), 0);
assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, atMiddle, swipe), 1);
assert.strictEqual(api.carouselPlayerAfterSwipe(2, track, atMiddle, swipe), 1);
assert.strictEqual(api.carouselPlayerAfterSwipe(1, track, atSecond, swipe), 1);

assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, solo, swipe), 0);
assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, atSecond, null), 0);
assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, atSecond, { user: false, moved: true }), 0);
assert.strictEqual(api.carouselPlayerAfterSwipe(0, track, atSecond, { user: true, start: 0, moved: false }), 0);

let gesture = { user: true, start: 40, moved: false };
gesture = api.carouselSwipeMarkGesture(gesture, 52);
assert.strictEqual(gesture.moved, false);
gesture = api.carouselSwipeMarkGesture(gesture, 53);
assert.strictEqual(gesture.moved, true);
gesture = api.carouselSwipeMarkGesture(gesture, 40);
assert.strictEqual(gesture.moved, true);
assert.strictEqual(api.carouselSwipeMarkGesture(null, 80), null);
assert.strictEqual(api.carouselSwipeMarkGesture({ user: false, start: 0, moved: false }, 80).user, false);

assert.strictEqual(APP_VERSION, "5.0.1");
assert.strictEqual(BACKUP_SCHEMA, 3);
assert.ok(html.includes('onclick="selectPlayer(${idx})"'));
assert.ok(html.includes("function bindPlayerCarouselSwipe"));
assert.ok(html.includes("bindPlayerCarouselSwipe()"));
assert.ok(html.includes("fromSwipe: true, holdScroll: true"));
assert.ok(html.includes('track.classList.toggle("solo", list.length === 1)'));
assert.ok(html.includes('appVersion: "5.0.1"'));
assert.ok(html.includes("version: 3"));
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(sw.includes('const SHELL = "fairway-v5-501"'));

console.log("carousel ok");
