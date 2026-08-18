import { readFile } from "node:fs/promises";

const env = await readFile(new URL("../../.env", import.meta.url), "utf8");
const match = env.match(/^(?:VITE|REACT_APP)_FIREBASE_DB=(.+)$/m);

if (!match?.[1]?.trim()) {
  throw new Error("Missing VITE_FIREBASE_DB or REACT_APP_FIREBASE_DB in the root .env file.");
}

export const databaseId = match[1].trim().replace(/^['"]|['"]$/g, "");
