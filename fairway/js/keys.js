/** Storage keys from the 4.0.11 audit. Schema of the JSON backup stays 3. */

export const APP_VERSION = "4.0.11";
export const BACKUP_SCHEMA = 3;

export const DB_NAME = "fairway";
export const DB_VERSION = 1;
export const STORE = "kv";

export const ROUNDS_KEY = "fairway.rounds.v1";
export const ROUNDS_BAK_KEY = "fairway.rounds.bak.v1";
export const ACTIVE_KEY = "fairway.activeRound.v1";
export const ACTIVE_BAK_KEY = "fairway.activeRound.bak.v1";
export const ROSTER_KEY = "fairway.savedPlayers.v1";
export const HOST_KEY = "fairway.host.v1";
export const DATA_UPDATED_KEY = "fairway.dataUpdatedAt";
export const CREATIVE_KEY = "fairway.creative.v1";
export const CREATIVE_PRESETS_KEY = "fairway.creativePresets.v1";
export const DRIVE_FILE_KEY = "fairway.drive.fileId";
export const DRIVE_FOLDER_KEY = "fairway.drive.folderId";
export const DRIVE_META_KEY = "fairway.drive.meta";

/** Not migrated: unused client-id slot and the in-memory OAuth token. */
export const DRIVE_CLIENT_KEY = "fairway.drive.clientId";

export const MIGRATION_STATE_KEY = "fairway.migration.v1";
export const MIGRATION_BACKUP_KEY = "fairway.migration.backup";

export const JSON_KEYS = [
  ROUNDS_KEY,
  ROUNDS_BAK_KEY,
  ACTIVE_KEY,
  ACTIVE_BAK_KEY,
  ROSTER_KEY,
  HOST_KEY,
  CREATIVE_KEY,
  CREATIVE_PRESETS_KEY,
  DRIVE_META_KEY
];

export const RAW_KEYS = [
  DATA_UPDATED_KEY,
  DRIVE_FILE_KEY,
  DRIVE_FOLDER_KEY
];

export const MIRRORED_KEYS = JSON_KEYS.concat(RAW_KEYS);
