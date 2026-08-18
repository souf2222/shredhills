// Regenerates functions/.env from the root .env before each deploy. The two
// database ids are project constants; they can be overridden by setting
// VITE_FIREBASE_DB_DEV / VITE_FIREBASE_DB_PROD in the root .env if the project
// layout ever changes. defineString defaults are runtime-only and do not
// satisfy deploy-time trigger resolution, so this file must exist at deploy.
import { readFile, writeFile } from "node:fs/promises";

const DEV_DEFAULT  = "dev-db";
const PROD_DEFAULT = "prod";

let rootEnv = "";
try { rootEnv = await readFile(".env", "utf8"); } catch { /* no root .env */ }

function pick(key, fallback) {
  const m = rootEnv.match(new RegExp(`^(?:VITE|REACT_APP)_${key}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : fallback;
}

const dev  = pick("FIREBASE_DB_DEV",  DEV_DEFAULT);
const prod = pick("FIRESTORE_DB_PROD", PROD_DEFAULT);

await writeFile("functions/.env", `FIRESTORE_DB_DEV=${dev}\nFIRESTORE_DB_PROD=${prod}\n`);
console.log(`Configured Cloud Functions for databases: dev=${dev}, prod=${prod}`);
