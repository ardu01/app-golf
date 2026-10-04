import { bindRoundsScope } from "./rounds.js";

const NAMES = [
  "hasStoredActiveRound",
  "playerHasMarks",
  "isRoundInProgress",
  "readRoundList",
  "loadRounds",
  "saveRounds",
  "formatRoundDate",
  "snapshotPlayers",
  "inspectActiveRaw",
  "inspectActiveKey",
  "noteActiveStorageError",
  "flushActiveStorageError",
  "storageSetItem",
  "activeBackupNeedsRecovery",
  "roundWouldBeReplaced",
  "localActiveRoundIsProtected",
  "commitActiveScore",
  "adjustActiveScore",
  "commitActivePutts",
  "adjustActivePutts",
  "commitActiveMark",
  "commitActiveTotal",
  "writeStoredActiveRound",
  "persistActiveRound",
  "clearActiveRound",
  "endActiveRoundMemory",
  "applyActivePayload",
  "restoreActiveRound",
  "recoverActiveRoundFromBackup",
  "flushActiveRoundForLifecycle",
  "bindActiveRoundLifecycle",
  "buildRoundRecord",
  "persistCompletedRound",
  "getRoundById",
  "deleteSavedRound",
  "reopenRound",
  "saveEditingRoundDraft"
];

const scope = globalThis.__fairwayRoundsScope || {};
const api = bindRoundsScope(scope);
for (const name of NAMES) globalThis[name] = api[name];

try {
  if (typeof globalThis.fairwayApplyStoredRound === "function") globalThis.fairwayApplyStoredRound();
} catch (e) {
  console.warn("fairway rounds", e);
}
