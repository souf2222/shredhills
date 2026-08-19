import { readFile } from "node:fs/promises";

const env = await readFile(new URL("../../.env", import.meta.url), "utf8");
// VITE_ takes priority over legacy REACT_APP_, matching src/firebase.js.
const vite   = env.match(/^VITE_FIREBASE_DB=(.+)$/m)?.[1];
const legacy = env.match(/^REACT_APP_FIREBASE_DB=(.+)$/m)?.[1];
const raw = (vite ?? legacy)?.trim().replace(/^['"]|['"]$/g, "");

if (!raw) {
  throw new Error("Missing VITE_FIREBASE_DB or REACT_APP_FIREBASE_DB in the root .env file.");
}

export const databaseId = raw;
