// functions/punch-backup.js - Automatic punch data backup system

const { FieldValue } = require("firebase-admin/firestore");

const BACKUPS_KEPT_PER_USER = 10;

// Same collision-proof id scheme as newPunchId() in src/utils/punchLogic.js
// (ESM, not requirable here) — keep the two in sync.
const newSessionId = () =>
  `P-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Backups taken before the hardened punch model may contain sessions with
// no id; restoring them verbatim would make those sessions un-editable and
// un-deletable (INVALID_SESSION / SESSION_NOT_FOUND). Assign fresh ids to
// any restored session missing one, skipping nothing else.
function ensureSessionIds(sessions) {
  if (!Array.isArray(sessions)) return sessions;
  const ids = new Set(sessions.filter((s) => typeof s?.id === "string" && s.id).map((s) => s.id));
  return sessions.map((s) => {
    if (typeof s?.id === "string" && s.id) return s;
    let id = newSessionId();
    while (ids.has(id)) id = newSessionId();
    ids.add(id);
    return { ...s, id };
  });
}

/**
 * Creates a backup of punch data before any modification.
 * @param {FirebaseFirestore.Firestore} db - Database instance the punches
 *   document lives in (dev-db or prod). Backups are stored in the SAME
 *   database so a restore finds them.
 * @param {string} userId - User ID to backup
 * @param {object} currentData - Current punch data to backup
 */
async function backupPunchData(db, userId, currentData) {
  try {
    // Create backup document with timestamp
    const backupRef = db.collection('punch_backups').doc(`${userId}_${Date.now()}`);

    await backupRef.set({
      userId: userId,
      backedUpAt: FieldValue.serverTimestamp(),
      originalData: currentData,
      backupReason: 'automatic_pre_write'
    });

    console.log(`✅ Punch backup created for user ${userId}`);

    // Clean up old backups (keep last 10 per user)
    await cleanupOldBackups(db, userId);

  } catch (error) {
    console.error(`❌ Failed to create punch backup for user ${userId}:`, error.message);
    // Don't throw - backup failure shouldn't block main operation
  }
}

/**
 * Restores punch data from latest backup.
 * @param {FirebaseFirestore.Firestore} db - Database instance to restore in.
 * @param {string} userId - User ID to restore
 */
async function restoreFromLatestBackup(db, userId) {
  try {
    // Get latest backup for user
    const backupsQuery = db
      .collection('punch_backups')
      .where('userId', '==', userId)
      .orderBy('backedUpAt', 'desc')
      .limit(1);

    const snapshot = await backupsQuery.get();

    if (snapshot.empty) {
      throw new Error(`No backups found for user ${userId}`);
    }

    const latestBackup = snapshot.docs[0].data();
    const originalData = latestBackup.originalData;

    // Restore to main punches collection in the same database, ensuring
    // every restored session carries an id (older snapshots may predate
    // the id requirement).
    await db.collection('punches').doc(userId).set({
      sessions: ensureSessionIds(originalData.sessions || []),
    });

    console.log(`✅ Punch data restored from backup for user ${userId}`);
    return originalData;

  } catch (error) {
    console.error(`❌ Failed to restore punch data for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Cleans up old backups, keeping only the last 10 per user.
 * @param {FirebaseFirestore.Firestore} db - Database instance with backups.
 * @param {string} userId - User ID to cleanup backups for
 */
async function cleanupOldBackups(db, userId) {
  try {
    // Get all backups for user, ordered by timestamp descending
    const allBackups = await db
      .collection('punch_backups')
      .where('userId', '==', userId)
      .orderBy('backedUpAt', 'desc')
      .get();

    const backupDocs = allBackups.docs;

    // Keep only the first 10 (most recent), delete the rest
    if (backupDocs.length > BACKUPS_KEPT_PER_USER) {
      const backupsToDelete = backupDocs.slice(BACKUPS_KEPT_PER_USER);
      const deletePromises = backupsToDelete.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`🧹 Cleaned up ${backupsToDelete.length} old backups for user ${userId}`);
    }

  } catch (error) {
    console.warn(`⚠️ Failed to cleanup backups for user ${userId}:`, error.message);
    // Non-critical - don't throw
  }
}

module.exports = {
  backupPunchData,
  restoreFromLatestBackup,
  cleanupOldBackups
};
