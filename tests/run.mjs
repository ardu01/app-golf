import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const files = ["scoring.mjs", "backup.mjs", "maps.mjs", "referee.mjs"];
let failed = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, [join(dir, file)], { stdio: "inherit" });
  if (res.status !== 0) failed++;
}
if (failed) {
  console.error(failed + " suite(s) failed");
  process.exit(1);
}
console.log("all tests ok");
