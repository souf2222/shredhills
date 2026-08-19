// Regenerates functions/.env from the root .env before each deploy so Cloud
// Functions operate on the exact database the app build uses. The single
// source of truth is VITE_FIREBASE_DB (or legacy REACT_APP_FIREBASE_DB).
// defineString values are runtime-only and do not satisfy deploy-time trigger
// resolution, so this file must exist at deploy.
import { mkdir, readFile, writeFile } from "node:fs/promises";

let rootEnv = "";
try { rootEnv = await readFile(".env", "utf8"); } catch { /* no root .env */ }

// VITE_ takes priority over legacy REACT_APP_, matching src/firebase.js.
const vite   = rootEnv.match(/^VITE_FIREBASE_DB=(.+)$/m)?.[1];
const legacy = rootEnv.match(/^REACT_APP_FIREBASE_DB=(.+)$/m)?.[1];
const databaseId = (vite ?? legacy)?.trim().replace(/^['"]|['"]$/g, "");

if (!databaseId) {
  throw new Error("Missing VITE_FIREBASE_DB (or REACT_APP_FIREBASE_DB) in the root .env file.");
}

await mkdir("functions", { recursive: true });
await writeFile("functions/.env", `FIRESTORE_DATABASE_ID=${databaseId}\n`);
console.log(`Configured Cloud Functions for database: ${databaseId}`);
