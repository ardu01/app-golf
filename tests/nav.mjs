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

const edge = loadFunctions(html, [
  "fairwayNavEdgeBandPx",
  "fairwayNavEdgeBand",
  "fairwayNavEdgeBlockView",
  "fairwayNavEdgeState",
  "fairwayHoleSheetIsOpen",
  "fairwayNavShouldBlockEdge",
  "fairwayNavNoteScroll",
  "fairwayNavRestoreScroll",
  "fairwayNavArmEdgeMove",
  "fairwayNavDisarmEdgeMove",
  "fairwayNavBlockEdgeTouch",
  "fairwayNavBlockEdgeMove",
  "fairwayNavBlockEdgeEnd",
  "fairwayNavSyncEdgeGuard",
  "fairwayNavHoldHomeTrap"
], { state: { screen: "home" } });
assert.strictEqual(edge.fairwayNavEdgeBandPx(), 30);
assert.strictEqual(edge.fairwayNavEdgeBand(0, 390), true);
assert.strictEqual(edge.fairwayNavEdgeBand(29.9, 390), true);
assert.strictEqual(edge.fairwayNavEdgeBand(30, 390), false);
assert.strictEqual(edge.fairwayNavEdgeBand(389, 390), false);
assert.strictEqual(edge.fairwayNavEdgeBand(-1, 390), false);
assert.strictEqual(edge.fairwayNavEdgeBand(10, 0), false);
assert.strictEqual(edge.fairwayNavEdgeBand(10, NaN), false);
assert.strictEqual(edge.fairwayNavEdgeBlockView("home", false), true);
assert.strictEqual(edge.fairwayNavEdgeBlockView("home", true), false);
for (const screen of ["perfil", "setup", "hole", "scorecard", "leader", "reglas", "close", "historial"]) {
  assert.strictEqual(edge.fairwayNavEdgeBlockView(screen, false), false, screen);
}

assert.ok(html.includes('id="fairwayEdgeGuard"'));
assert.ok(html.includes('class="fairway-edge-guard" hidden'));
assert.ok(html.includes("width: 30px"));
assert.ok(html.includes("overscroll-behavior-x: none"));
assert.ok(html.includes("html.fairway-edge-lock"));
assert.ok(html.includes("touch-action: pan-y"));
assert.ok(html.includes("touch-action: manipulation"));
assert.ok(html.includes("padding: 6px 16px 22px 32px"));
assert.ok(html.includes('addEventListener("touchstart", fairwayNavBlockEdgeTouch, { passive: false, capture: true })'));
const blockSrc = extractFunction(html, "fairwayNavBlockEdgeTouch");
const gateAt = blockSrc.indexOf("fairwayNavShouldBlockEdge");
const bandAt = blockSrc.indexOf("fairwayNavEdgeBand");
const prevAt = blockSrc.indexOf("preventDefault");
assert.ok(gateAt > 0 && bandAt > gateAt && prevAt > bandAt);
assert.ok(blockSrc.includes("touches.length !== 1"));
assert.ok(blockSrc.includes("cancelable"));
const bootEdge = extractFunction(html, "fairwayNavBoot");
assert.ok(bootEdge.includes('scrollRestoration = "manual"'));
assert.ok(bootEdge.includes("fairwayNavSyncEdgeGuard"));
assert.ok(bootEdge.includes('guard.addEventListener("touchmove", fairwayNavBlockEdgeMove, { passive: false })'));
assert.ok(!bootEdge.includes('document.addEventListener("touchmove"'));
assert.ok(extractFunction(html, "fairwayNavArmEdgeMove").includes('document.addEventListener("touchmove", fairwayNavBlockEdgeMove, { passive: false, capture: true })'));
assert.ok(extractFunction(html, "go").includes("fairwayNavSyncEdgeGuard"));
assert.ok(extractFunction(html, "fairwayNavOnPageShow").includes("fairwayNavSyncEdgeGuard"));
const holdSrc = extractFunction(html, "fairwayNavHoldHomeTrap");
assert.ok(holdSrc.includes("fairwayNavRestoreScroll"));
assert.ok(!holdSrc.includes("go("));
assert.ok(!holdSrc.includes("fairwaySheetDom"));
const popEdge = extractFunction(html, "fairwayOnPopState");
const trapAt = popEdge.indexOf('if (decision.type === "trap")');
const trapEnd = popEdge.indexOf("return;", trapAt);
const trapBody = popEdge.slice(trapAt, trapEnd);
assert.ok(trapBody.includes('state.screen === "home"'));
assert.ok(trapBody.includes("fairwayNavHoldHomeTrap"));
assert.ok(trapBody.includes("fairwayNavScheduleHomeSentinel"));
assert.ok(!trapBody.includes("go("));
assert.ok(!trapBody.includes("fairwaySheetDom"));
assert.ok(!trapBody.includes("classList"));
assert.ok(popEdge.includes("go(decision.screen)"));

const guard = { hidden: true };
const classes = {};
const listened = [];
const prevDocument = global.document;
const prevWindow = global.window;
global.window = { innerWidth: 390, scrollY: 12, scrollTo(x, y) { this.scrollY = y; } };
global.document = {
  getElementById(id) {
    if (id === "fairwayEdgeGuard") return guard;
    if (id === "holeSheet") return global.__fairwayHoleSheet || null;
    return null;
  },
  documentElement: { classList: { toggle(name, on) { classes[name] = !!on; } } },
  addEventListener(type, fn, opts) { listened.push(["add", type, !!(opts && opts.capture), !!(opts && opts.passive === false)]); },
  removeEventListener(type) { listened.push(["remove", type]); }
};
function resetEdge() {
  edge.fairwayNavEdgeState.box = null;
  guard.hidden = true;
  listened.length = 0;
}
resetEdge();
edge.fairwayNavSyncEdgeGuard();
assert.strictEqual(guard.hidden, false);
assert.strictEqual(classes["fairway-edge-lock"], true);
let prevented = 0;
edge.fairwayNavBlockEdgeTouch({
  cancelable: true,
  touches: [{ clientX: 4 }],
  preventDefault() { prevented++; }
});
assert.strictEqual(prevented, 1);
assert.strictEqual(edge.fairwayNavEdgeState().touch, true);
assert.ok(listened.some(row => row[0] === "add" && row[1] === "touchmove" && row[3] === true));
edge.fairwayNavBlockEdgeMove({ cancelable: true, preventDefault() { prevented++; } });
assert.strictEqual(prevented, 2);
edge.fairwayNavBlockEdgeEnd();
assert.strictEqual(edge.fairwayNavEdgeState().touch, false);
assert.ok(listened.some(row => row[0] === "remove" && row[1] === "touchmove"));

prevented = 0;
edge.fairwayNavBlockEdgeTouch({
  cancelable: true,
  touches: [{ clientX: 80 }],
  preventDefault() { prevented++; }
});
assert.strictEqual(prevented, 0);
assert.strictEqual(edge.fairwayNavEdgeState().touch, false);

prevented = 0;
edge.fairwayNavBlockEdgeTouch({
  cancelable: true,
  touches: [{ clientX: 2 }, { clientX: 3 }],
  preventDefault() { prevented++; }
});
assert.strictEqual(prevented, 0);

const homeState = { screen: "home" };
const nested = loadFunctions(html, [
  "fairwayNavEdgeState",
  "fairwayHoleSheetIsOpen",
  "fairwayNavEdgeBlockView",
  "fairwayNavShouldBlockEdge",
  "fairwayNavNoteScroll",
  "fairwayNavArmEdgeMove",
  "fairwayNavDisarmEdgeMove",
  "fairwayNavBlockEdgeTouch",
  "fairwayNavBlockEdgeEnd",
  "fairwayNavSyncEdgeGuard"
], { state: homeState });
homeState.screen = "perfil";
prevented = 0;
nested.fairwayNavBlockEdgeTouch({
  cancelable: true,
  touches: [{ clientX: 1 }],
  preventDefault() { prevented++; }
});
assert.strictEqual(prevented, 0, "perfil keeps the edge swipe");
nested.fairwayNavSyncEdgeGuard();
assert.strictEqual(guard.hidden, true);
assert.strictEqual(classes["fairway-edge-lock"], false);
homeState.screen = "hole";
nested.fairwayNavSyncEdgeGuard();
assert.strictEqual(guard.hidden, true);
homeState.screen = "home";
global.__fairwayHoleSheet = { classList: { contains(name) { return name === "open"; } } };
nested.fairwayNavSyncEdgeGuard();
assert.strictEqual(guard.hidden, true);
assert.strictEqual(nested.fairwayNavShouldBlockEdge(), false);
global.__fairwayHoleSheet = null;
nested.fairwayNavSyncEdgeGuard();
assert.strictEqual(guard.hidden, false);

global.window.scrollY = 40;
edge.fairwayNavNoteScroll();
global.window.scrollY = 0;
edge.fairwayNavRestoreScroll();
assert.strictEqual(global.window.scrollY, 40);

global.document = prevDocument;
global.window = prevWindow;
delete global.__fairwayHoleSheet;

console.log("nav ok");
