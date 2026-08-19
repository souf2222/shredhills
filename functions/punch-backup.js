// functions/punch-backup.js - Automatic punch data backup system

const { getFirestore } = require("firebase-admin/firestore");
const { FieldValue } = require("firebase-admin/firestore");

/**
 * Creates a backup of punch data before any modification
 * @param {string} databaseId - Database ID ('dev-db' or production)
 * @param {string} userId - User ID to backup
 * @param {object} currentData - Current punch data to backup
 */
async function backupPunchData(databaseId, userId, currentData) {
  try {
    const db = getFirestore();
    
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
    await cleanupOldBackups(userId);
    
  } catch (error) {
    console.error(`❌ Failed to create punch backup for user ${userId}:`, error.message);
    // Don't throw - backup failure shouldn't block main operation
  }
}

/**
 * Restores punch data from latest backup
 * @param {string} databaseId - Database ID
 * @param {string} userId - User ID to restore
 */
async function restoreFromLatestBackup(databaseId, userId) {
  try {
    const db = getFirestore();
    
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
    
    // Restore to main punches collection
    await db.collection('punches').doc(userId).set(originalData);
    
    console.log(`✅ Punch data restored from backup for user ${userId}`);
    return originalData;
    
  } catch (error) {
    console.error(`❌ Failed to restore punch data for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Cleans up old backups, keeping only the last 10 per user
 * @param {string} userId - User ID to cleanup backups for
 */
async function cleanupOldBackups(userId) {
  try {
    const db = getFirestore();
    
    // Get all backups for user, ordered by timestamp descending
    const allBackups = await db
      .collection('punch_backups')
      .where('userId', '==', userId)
      .orderBy('backedUpAt', 'desc')
      .get();
      
    const backupDocs = allBackups.docs;
    
    // Keep only the first 10 (most recent), delete the rest
    if (backupDocs.length > 10) {
      const backupsToDelete = backupDocs.slice(10);
      const deletePromises = backupsToDelete.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`🧹 Cleaned up ${backupsToDelete.length} old backups for user ${userId}`);
    }
    
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup old backups for user ${userId}:`, error.message);
    // Non-critical - don't throw
  }
}

module.exports = {
  backupPunchData,
  restoreFromLatestBackup,
  cleanupOldBackups
};