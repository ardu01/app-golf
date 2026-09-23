import assert from "assert";
import { readApp, extractBetween } from "./extract.mjs";

const html = readApp();
const block = extractBetween(html, "/* REFEREE_START */", "/* REFEREE_END */");
const api = new Function(block + "\nreturn { refereeFacts, refereeInfer, refereeDecide, bindAnswer, refHit, normRef, REFEREE_NOTE };")();

function decide(text) {
  const facts = api.refereeInfer(api.refereeFacts(text));
  return api.refereeDecide(facts);
}

function cites(res) {
  return (res.cites || []).map(c => c.rule).join(" ");
}

let res = decide("Se fue hacia el agua lateral y la vi entrar");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("17.1"));
assert.ok(!/17\.1d\(3\)/.test(cites(res)) || cites(res).includes("17.1"));

res = decide("La bola está en el agua lateral y la vi entrar");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("17.1d"));

res = decide("Está en el agua amarilla y la vi entrar");
assert.strictEqual(res.kind, "rule");
assert.ok(!cites(res).includes("17.1d(3)") || cites(res).includes("17.1"));
assert.ok(cites(res).includes("17.1"));

res = decide("Se fue hacia el agua pero no la vi entrar");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("18.2") || cites(res).includes("17.1c"));

res = decide("La bola está detrás de un árbol y no tengo swing");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("19.2"));
assert.ok(res.text.toLowerCase().includes("injugable") || res.text.toLowerCase().includes("no hay alivio"));

res = decide("La bola está en el árbol");
assert.strictEqual(res.kind, "rule");
assert.ok(res.text.includes("en el árbol"));

res = decide("Ha caído en un divot en la calle");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("19.2"));
assert.ok(!res.text.toLowerCase().includes("alivio gratis") || res.text.toLowerCase().includes("no da alivio"));

res = decide("Hay un charco y la bola está dentro");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("16.1"));

res = decide("Marca de pitch en el green");
assert.notStrictEqual(decide("La bola está empotrada en el rough").text, res.text);

res = decide("Está empotrada en el rough");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("16.3"));

res = decide("En el búnker");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("12.2"));

let facts = api.refereeInfer(api.refereeFacts("La declaro injugable"));
assert.strictEqual(api.refereeDecide(facts).kind, "ask");
facts = api.bindAnswer("place", "En el búnker", facts);
res = api.refereeDecide(api.refereeInfer(facts));
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("19.3"));

facts = api.refereeInfer(api.refereeFacts("Se me ha ido al agua"));
assert.strictEqual(api.refereeDecide(facts).kind, "ask");
facts = api.bindAnswer("water-color", "Rojas", facts);
res = api.refereeDecide(api.refereeInfer(facts));
assert.ok(cites(res).includes("17.1"));

res = decide("Bola provisional, no la encuentro");
assert.ok(res.kind === "rule" || res.kind === "ask");

res = decide("He movido la bola al buscarla");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("9.4"));

res = decide("Se ha movido");
assert.strictEqual(res.kind, "ask");

res = decide("Era la bola equivocada");
assert.strictEqual(res.kind, "rule");

res = decide("El putt ha dado en la bandera, nadie la atendía");
assert.strictEqual(res.kind, "rule");
assert.ok(cites(res).includes("13.2"));

res = decide("Hay una valla");
assert.strictEqual(res.kind, "ask");

res = decide("no tengo swing");
assert.strictEqual(res.kind, "ask");

res = decide("Se me ha caído del tee");
assert.strictEqual(res.kind, "rule");

assert.ok(api.REFEREE_NOTE.toLowerCase().includes("regla local"));
assert.strictEqual(api.refHit(api.normRef("no está empotrada, está en el rough"), ["empotrad"]), false);
assert.strictEqual(api.refHit(api.normRef("está empotrada en el rough"), ["empotrad"]), true);

console.log("referee ok");
