import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Signs everyone out by revoking every user's refresh tokens. Active users
// are disconnected when the Firebase SDK next refreshes their ID token (at
// most 1 hour); they simply sign in again with their credentials.
//
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   node functions/scripts/revoke-all-sessions.mjs            # revoke
//   node functions/scripts/revoke-all-sessions.mjs --dry-run  # count only
const dryRun = process.argv.includes("--dry-run");

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? undefined
  : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });

const auth = getAuth();
let revoked = 0;
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  if (!dryRun) {
    await Promise.all(page.users.map((user) => auth.revokeRefreshTokens(user.uid)));
  }
  revoked += page.users.length;
  pageToken = page.pageToken;
} while (pageToken);

console.log(dryRun
  ? `Dry run: ${revoked} user(s) would be signed out.`
  : `Revoked sessions for ${revoked} user(s). They must sign in again.`);
