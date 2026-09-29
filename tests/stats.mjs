import assert from "assert";
import { extractFunction, readApp } from "./extract.mjs";

const html = readApp();
const api = new Function(
  extractFunction(html, "statsNum") + "\n" +
  extractFunction(html, "statsGrossByLayout") + "\n" +
  extractFunction(html, "statsAvg") + "\n" +
  "return { statsGrossByLayout, statsAvg };"
)();

function round(holes, gross) {
  return { holes: holes, me: { gross: gross } };
}

{
  const mixed = api.statsGrossByLayout([
    round(9, 40),
    round(9, 42),
    round(18, 80),
    round(18, 90)
  ]);
  assert.deepStrictEqual(mixed[9], [40, 42]);
  assert.deepStrictEqual(mixed[18], [80, 90]);
  assert.strictEqual(api.statsAvg(mixed[9]), 41);
  assert.strictEqual(api.statsAvg(mixed[18]), 85);
  const blended = mixed[9].concat(mixed[18]);
  assert.notStrictEqual(api.statsAvg(blended), api.statsAvg(mixed[9]));
  assert.notStrictEqual(api.statsAvg(blended), api.statsAvg(mixed[18]));
}

{
  const only18 = api.statsGrossByLayout([round(18, 72), round(18, 80)]);
  assert.deepStrictEqual(only18[9], []);
  assert.strictEqual(api.statsAvg(only18[18]), 76);
}

{
  const skipped = api.statsGrossByLayout([
    round(18, 70),
    { holes: 12, me: { gross: 50 } },
    { holes: 9, me: {} }
  ]);
  assert.deepStrictEqual(skipped[18], [70]);
  assert.deepStrictEqual(skipped[9], []);
}

{
  const zero = api.statsGrossByLayout([{ holes: 18, me: { gross: null } }]);
  assert.deepStrictEqual(zero[18], [0]);
}

assert.ok(html.includes("Gross · 9"));
assert.ok(html.includes("Gross · 18"));
assert.ok(html.includes("no se mezclan"));
assert.ok(html.includes("hi * (Number(tee.slope) / 113)"));

console.log("stats ok");
