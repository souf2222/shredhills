// tests/sync-functions-env.test.mjs
// Unit tests for scripts/sync-functions-env.mjs — the predeploy bridge that
// propagates VITE_FIREBASE_DB from the root .env into functions/.env.
// Each case runs the script in an isolated temp directory so the real repo
// files are never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = new URL("../scripts/sync-functions-env.mjs", import.meta.url).pathname;

async function runWithEnv(envContent) {
  const dir = await mkdtemp(join(tmpdir(), "sync-env-test-"));
  if (envContent !== null) {
    await writeFile(join(dir, ".env"), envContent);
  }
  try {
    const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
    let written = null;
    try {
      written = await readFile(join(dir, "functions", ".env"), "utf8");
    } catch { /* script may not have written the file */ }
    return { result, written };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("writes FIRESTORE_DATABASE_ID from VITE_FIREBASE_DB", async () => {
  const { result, written } = await runWithEnv("VITE_FIREBASE_DB=dev-db\n");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(written, "FIRESTORE_DATABASE_ID=dev-db\n");
  assert.match(result.stdout, /dev-db/);
});

test("falls back to legacy REACT_APP_FIREBASE_DB", async () => {
  const { result, written } = await runWithEnv("REACT_APP_FIREBASE_DB=prod\n");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(written, "FIRESTORE_DATABASE_ID=prod\n");
});

test("prefers VITE_ over REACT_APP_ when both are present", async () => {
  const { written } = await runWithEnv("REACT_APP_FIREBASE_DB=prod\nVITE_FIREBASE_DB=dev-db\n");
  assert.equal(written, "FIRESTORE_DATABASE_ID=dev-db\n");
});

test("trims whitespace and surrounding quotes", async () => {
  const { written } = await runWithEnv('VITE_FIREBASE_DB=  "prod"  \n');
  assert.equal(written, "FIRESTORE_DATABASE_ID=prod\n");
});

test("fails loudly when VITE_FIREBASE_DB is missing", async () => {
  const { result, written } = await runWithEnv("VITE_FIREBASE_API_KEY=x\n");
  assert.notEqual(result.status, 0);
  assert.equal(written, null);
  assert.match(result.stderr, /Missing VITE_FIREBASE_DB/);
});

test("fails loudly when VITE_FIREBASE_DB is empty", async () => {
  const { result } = await runWithEnv("VITE_FIREBASE_DB=\n");
  assert.notEqual(result.status, 0);
});

test("fails loudly when there is no .env at all", async () => {
  const { result } = await runWithEnv(null);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing VITE_FIREBASE_DB/);
});
