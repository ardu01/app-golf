import { bindScoringScope } from "./scoring.js";

const NAMES = [
  "stablefordHole",
  "holesInRound",
  "scaleHandicapForRound",
  "resolveSetupTee",
  "courseHandicapFor",
  "playerCourseHcp",
  "relativeStrokeIndex",
  "strokesOnHole",
  "modeRankCmp",
  "modeTie",
  "activePlayers",
  "plaqueIsHerreria",
  "playerGross",
  "playerParPlayed",
  "chaosSpin",
  "blankModeScore",
  "applyModeScores",
  "attachModeScores",
  "liveStandings",
  "pickWinner"
];

const scope = globalThis.__fairwayScoringScope || {};
const api = bindScoringScope(scope);
for (const name of NAMES) globalThis[name] = api[name];

try {
  if (typeof globalThis.refreshPlayerHandicaps === "function") globalThis.refreshPlayerHandicaps();
} catch (e) {
  console.warn("fairway scoring", e);
}
