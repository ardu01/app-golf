import assert from "assert";
import { readFileSync } from "fs";
import { bagNames, caddieCard, holeCardFact } from "../fairway/js/caddie.js";
import { BAG_KEY, MIRRORED_KEYS } from "../fairway/js/keys.js";

assert.strictEqual(BAG_KEY, "fairway.bag.v1");
assert.ok(MIRRORED_KEYS.indexOf(BAG_KEY) >= 0);

const full = holeCardFact({ par: 4, hcp: 7, m: 312 });
assert.deepStrictEqual(full, { par: 4, si: 7, meters: 312 });

const noMeters = holeCardFact({ par: 3, hcp: 17 });
assert.strictEqual(noMeters.meters, null);
assert.strictEqual(noMeters.par, 3);

const card = caddieCard({ par: 5, hcp: 1, m: 480 }, [
  { name: "Driver" },
  { name: "<img src=x onerror=alert(1)>" },
  "  Madera 3  "
]);
assert.strictEqual(card.factLine, "Par 5 · SI 1 · 480 m");
assert.strictEqual(card.meters, 480);
assert.deepStrictEqual(card.clubs, ["Driver", "img src=x onerror=alert(1)", "Madera 3"]);
assert.ok(!Object.prototype.hasOwnProperty.call(card, "yards"));
card.clubs.forEach((name) => {
  assert.strictEqual(typeof name, "string");
  assert.ok(!/[<>]/.test(name));
});

const empty = caddieCard({ par: 4, hcp: 9 }, []);
assert.strictEqual(empty.meters, null);
assert.ok(!empty.factLine.includes(" m"));
assert.deepStrictEqual(empty.clubs, []);

assert.deepStrictEqual(bagNames(["ok", "", "  ", { name: "Hierro 7" }, { meters: 150 }]), ["ok", "Hierro 7"]);

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.ok(html.includes('id="holeCallCaddie"'));
assert.ok(html.includes("tel:+34918905111"));
assert.ok(html.includes('id="holeBagBtn"'));
assert.ok(html.includes("fairway/js/caddie.js"));
assert.ok(html.includes("Fairway no inventa distancias"));
assert.ok(!html.includes("clubDistance"));

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(sw.includes("fairway/js/caddie.js"));

console.log("caddie ok");
