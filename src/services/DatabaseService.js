import * as SQLite from 'expo-sqlite';

let db = null;
let initPromise = null;

async function getDb() {
  if (db) return db;

  // Evita múltiples inicializaciones concurrentes
  if (initPromise) return initPromise;

  initPromise = (async () => {
    db = await SQLite.openDatabaseAsync('diariamente.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        antecedent TEXT,
        belief TEXT,
        consequence TEXT,
        user_emotion TEXT,
        detected_emotion TEXT,
        detected_distortion TEXT,
        confidence_score REAL,
        risk_score REAL,
        flag_riesgo_suicida INTEGER DEFAULT 0,
        crisis_notified INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return db;
  })();

  return initPromise;
}

export const DatabaseService = {
  async initDatabase() {
    await getDb();
    console.log('✅ Base de datos local inicializada');
  },

  async saveEntryLocally(entry) {
    const database = await getDb();
    const result = await database.runAsync(
      `INSERT INTO diary_entries (
        antecedent, belief, consequence, user_emotion,
        detected_emotion, detected_distortion, confidence_score,
        risk_score, flag_riesgo_suicida, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        entry.antecedent || null,
        entry.belief || null,
        entry.consequence || null,
        entry.user_emotion || null,
        entry.detected_emotion || null,
        entry.detected_distortion || null,
        entry.confidence_score || 0,
        entry.risk_score || 0,
        entry.flag_riesgo_suicida ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  },

  async markAsSynced(entryId) {
    const database = await getDb();
    await database.runAsync(
      `UPDATE diary_entries SET synced = 1 WHERE id = ?;`,
      [entryId]
    );
  },

  async getUnsyncedEntries() {
    const database = await getDb();
    return await database.getAllAsync(
      `SELECT * FROM diary_entries WHERE synced = 0 ORDER BY created_at ASC;`
    );
  },

  async getAllEntries() {
    const database = await getDb();
    return await database.getAllAsync(
      `SELECT * FROM diary_entries ORDER BY created_at DESC LIMIT 100;`
    );
  },

  async getEntryById(id) {
    const database = await getDb();
    return await database.getFirstAsync(
      `SELECT * FROM diary_entries WHERE id = ?;`,
      [id]
    );
  },
};