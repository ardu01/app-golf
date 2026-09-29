import assert from "assert";
import { extractFunction, loadFunctions, readApp } from "./extract.mjs";

const html = readApp();
const api = loadFunctions(html, [
  "fairwayNavKnownScreen",
  "fairwayNavPlayScreen",
  "fairwayNavSameView",
  "fairwayNavTarget",
  "fairwayNavDecide",
  "fairwayNavHref"
]);

const home = { screen: "home", sheet: "", setupStep: 0 };
const hole = { screen: "hole", sheet: "", setupStep: 0 };
const holeSheet = { screen: "hole", sheet: "hole", setupStep: 0 };
const perfil = { screen: "perfil", sheet: "", setupStep: 0 };
const close = { screen: "close", sheet: "", setupStep: 0 };

let d = api.fairwayNavDecide(perfil, { fairwayNav: 1, screen: "home" }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");
assert.strictEqual(d.sheet, "");
assert.strictEqual(d.repush, false);

d = api.fairwayNavDecide(holeSheet, { fairwayNav: 1, screen: "hole", sheet: "" }, { trap: false, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "hole");
assert.strictEqual(d.sheet, "");

d = api.fairwayNavDecide(holeSheet, { fairwayNav: 1, screen: "hole", sheet: "hole" }, { trap: false, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.sheet, "hole");

d = api.fairwayNavDecide(hole, { fairwayNav: 1, screen: "home" }, { trap: false, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");

d = api.fairwayNavDecide(home, { fairwayNav: 1, root: true, screen: "home" }, { trap: true, keepsPlay: true });
assert.strictEqual(d.type, "trap");

d = api.fairwayNavDecide(perfil, { fairwayNav: 1, root: true, screen: "home" }, { trap: true, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");
assert.strictEqual(d.repush, true);

d = api.fairwayNavDecide(home, { fairwayNav: 1, root: true, screen: "home" }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "trap");

d = api.fairwayNavDecide(perfil, { fairwayNav: 1, root: true, screen: "home" }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");
assert.strictEqual(d.repush, true);

d = api.fairwayNavDecide(hole, { fairwayNav: 1, root: true, screen: "hole" }, { trap: false, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "hole");
assert.strictEqual(d.repush, false);

d = api.fairwayNavDecide(close, { fairwayNav: 1, screen: "hole" }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "stay");
assert.strictEqual(d.resync, true);

d = api.fairwayNavDecide({ screen: "home", sheet: "", setupStep: 0 }, { fairwayNav: 1, screen: "scorecard" }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");

d = api.fairwayNavDecide(close, { fairwayNav: 1, screen: "hole" }, { trap: true, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "hole");

d = api.fairwayNavDecide(
  { screen: "setup", sheet: "", setupStep: 2 },
  { fairwayNav: 1, screen: "setup", setupStep: 1 },
  { trap: false, keepsPlay: true }
);
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "setup");
assert.strictEqual(d.setupStep, 1);

assert.strictEqual(api.fairwayNavDecide(home, null, { trap: true, keepsPlay: true }).type, "trap");
assert.strictEqual(api.fairwayNavDecide(home, null, { trap: false, keepsPlay: false }).type, "trap");
assert.strictEqual(api.fairwayNavDecide(hole, null, { trap: false, keepsPlay: false }).type, "stay");
assert.strictEqual(api.fairwayNavDecide(hole, { fairwayNav: 0 }, { trap: true, keepsPlay: true }).type, "trap");

d = api.fairwayNavDecide(home, { fairwayNav: 1, screen: "home", trap: 2 }, { trap: true, keepsPlay: false });
assert.strictEqual(d.type, "trap");
d = api.fairwayNavDecide(home, { fairwayNav: 1, screen: "home", trap: 2 }, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "trap");

d = api.fairwayNavDecide(perfil, { fairwayNav: 1, screen: "home", trap: 2 }, { trap: true, keepsPlay: false });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");
assert.strictEqual(d.sheet, "");
assert.strictEqual(d.repush, false);

d = api.fairwayNavDecide(holeSheet, { fairwayNav: 1, screen: "hole", sheet: "" }, { trap: true, keepsPlay: true });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "hole");
assert.strictEqual(d.sheet, "");
assert.strictEqual(d.repush, false);

const homeHref = api.fairwayNavHref({ screen: "home" });
const perfilHref = api.fairwayNavHref({ screen: "perfil" });
const holeHref = api.fairwayNavHref({ screen: "hole" });
const sheetHref = api.fairwayNavHref({ screen: "hole", sheet: "hole" });
const stepHref = api.fairwayNavHref({ screen: "setup", setupStep: 2 });
const trapHref = api.fairwayNavHref({ screen: "home", trap: 1 });
const trapHref2 = api.fairwayNavHref({ screen: "home", trap: 2 });
assert.ok(perfilHref.includes("#s=perfil"));
assert.ok(holeHref.includes("#s=hole"));
assert.ok(sheetHref.includes("s=hole") && sheetHref.includes("o=hole"));
assert.ok(stepHref.includes("s=setup") && stepHref.includes("p=2"));
assert.ok(trapHref.includes("#b=1") || trapHref.endsWith("#b=1"));
assert.ok(trapHref2.includes("#b=2"));
assert.notStrictEqual(trapHref, trapHref2);
assert.notStrictEqual(homeHref, perfilHref);
assert.notStrictEqual(homeHref, trapHref);
assert.notStrictEqual(holeHref, sheetHref);
assert.notStrictEqual(stepHref, api.fairwayNavHref({ screen: "setup", setupStep: 0 }));

for (const name of ["fairwayNavDecide", "fairwayOnPopState", "fairwayNavPush", "fairwayNavBoot", "closeHoleSheet"]) {
  const src = extractFunction(html, name);
  assert.ok(!src.includes("clearActiveRound"), name);
  assert.ok(!src.includes("endActiveRoundMemory"), name);
  assert.ok(!src.includes("persistCompletedRound"), name);
}

const goSrc = extractFunction(html, "go");
assert.ok(goSrc.includes("restoreActiveRound"));
assert.ok(goSrc.includes("fairwayNavPush"));
assert.ok(goSrc.includes("endActiveRoundMemory"));
assert.ok(!goSrc.includes("clearActiveRound"));

const setupBack = extractFunction(html, "setupBack");
assert.ok(setupBack.includes("history.back"));
assert.ok(setupBack.includes("setupStep--"));
assert.ok(html.includes('addEventListener("popstate", fairwayOnPopState)'));
assert.ok(html.includes("history.pushState"));
assert.ok(html.includes("history.replaceState"));
assert.ok(html.includes("fairwayNavBoot()"));
assert.ok(extractFunction(html, "fairwayNavShouldTrap").includes('state.screen === "home"'));
assert.ok(extractFunction(html, "fairwayNavBoot").includes("fairwayNavShouldTrap()"));
assert.ok(extractFunction(html, "fairwayNavArmTrap").includes("fairwayNavShouldTrap()"));
const homeTrap = loadFunctions(html, ["fairwayNavShouldTrap"], { state: { screen: "home" } });
assert.strictEqual(homeTrap.fairwayNavShouldTrap(), true);

const planApi = loadFunctions(html, [
  "fairwayNavSameView",
  "fairwayNavHomeSentinelDepth",
  "fairwayNavSentinelPlan"
]);
assert.strictEqual(planApi.fairwayNavHomeSentinelDepth(), 3);
let plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, screen: "home", trap: 2 },
  home,
  { trap: true }
);
assert.strictEqual(plan.push, 1);
assert.strictEqual(plan.defer, true);
plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, root: true, screen: "home" },
  home,
  { trap: true }
);
assert.strictEqual(plan.push, 3);
assert.strictEqual(plan.defer, true);
plan = planApi.fairwayNavSentinelPlan(null, home, { trap: false });
assert.strictEqual(plan.push, 3);
plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, screen: "perfil" },
  perfil,
  { trap: false }
);
assert.strictEqual(plan.push, 0);
plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, screen: "perfil" },
  home,
  { trap: true }
);
assert.strictEqual(plan.push, 0);
plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, screen: "setup", setupStep: 1 },
  { screen: "setup", sheet: "", setupStep: 1 },
  { trap: false }
);
assert.strictEqual(plan.push, 0);
plan = planApi.fairwayNavSentinelPlan(
  { fairwayNav: 1, screen: "hole", sheet: "hole", setupStep: 0 },
  holeSheet,
  { trap: true }
);
assert.strictEqual(plan.push, 0);
plan = planApi.fairwayNavSentinelPlan(null, hole, { trap: true });
assert.strictEqual(plan.push, 1);
plan = planApi.fairwayNavSentinelPlan(null, hole, { trap: false });
assert.strictEqual(plan.push, 0);

let stack = [{ fairwayNav: 1, root: true, screen: "home", sheet: "", setupStep: 0 }];
for (let i = 1; i <= planApi.fairwayNavHomeSentinelDepth(); i++) {
  stack.push({ fairwayNav: 1, screen: "home", sheet: "", setupStep: 0, trap: i });
}
stack.push({ fairwayNav: 1, screen: "perfil", sheet: "", setupStep: 0 });
let landed = stack[stack.length - 2];
stack.pop();
d = api.fairwayNavDecide(perfil, landed, { trap: true, keepsPlay: false });
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "home");
assert.strictEqual(d.repush, false);
assert.strictEqual(stack.length, 1 + planApi.fairwayNavHomeSentinelDepth());
landed = stack[stack.length - 2];
stack.pop();
d = api.fairwayNavDecide(home, landed, { trap: false, keepsPlay: false });
assert.strictEqual(d.type, "trap");
plan = planApi.fairwayNavSentinelPlan(landed, home, { trap: true });
assert.strictEqual(plan.defer, true);
assert.ok(plan.push >= 1);
stack.push({ fairwayNav: 1, screen: "setup", sheet: "", setupStep: 0 });
stack.push({ fairwayNav: 1, screen: "setup", sheet: "", setupStep: 1 });
landed = stack[stack.length - 2];
stack.pop();
d = api.fairwayNavDecide(
  { screen: "setup", sheet: "", setupStep: 1 },
  landed,
  { trap: false, keepsPlay: true }
);
assert.strictEqual(d.type, "apply");
assert.strictEqual(d.screen, "setup");
assert.strictEqual(d.setupStep, 0);
plan = planApi.fairwayNavSentinelPlan(landed, { screen: "setup", sheet: "", setupStep: 0 }, { trap: false });
assert.strictEqual(plan.push, 0);

const popSrc = extractFunction(html, "fairwayOnPopState");
assert.ok(popSrc.includes("fairwayNavScheduleHomeSentinel"));
assert.ok(!popSrc.includes("history.pushState"));
assert.ok(!popSrc.includes("fairwayNavRepush"));
const scheduleSrc = extractFunction(html, "fairwayNavScheduleHomeSentinel");
assert.ok(scheduleSrc.includes("setTimeout"));
assert.ok(scheduleSrc.includes(", 0)"));
assert.ok(scheduleSrc.includes(", 50)"));
const bootSrc = extractFunction(html, "fairwayNavBoot");
assert.ok(bootSrc.includes("fairwayNavHomeSentinelDepth"));
assert.ok(bootSrc.includes("for ("));
assert.ok(bootSrc.includes("pageshow"));
const armSrc = extractFunction(html, "fairwayNavArmTrap");
assert.ok(armSrc.includes("gesture"));
assert.ok(armSrc.includes("fairwayNavHomeSentinelDepth"));
assert.ok(!armSrc.includes("!cur.root"));
assert.ok(html.includes('addEventListener("touchstart", fairwayNavArmTrap, { passive: true, capture: true })'));
assert.ok(html.includes('const FAIRWAY_DRIVE_CLIENT_ID = "429682128465-06rq4tc60pmo6r0808a8b27itcp9v9dv.apps.googleusercontent.com"'));
assert.ok(html.includes("version: 3"));

console.log("nav ok");
