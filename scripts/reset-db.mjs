// Wipes the local database and uploads, so the next request re-seeds from scratch.
// Never point DATA_DIR at production when running this.
import fs from "node:fs";
import path from "node:path";

const dir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

if (!fs.existsSync(dir)) {
  console.log(`Nothing to reset — ${dir} does not exist.`);
  process.exit(0);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}. Start the app to rebuild and re-seed it.`);
