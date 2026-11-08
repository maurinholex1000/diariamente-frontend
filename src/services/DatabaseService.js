
import * as SQLite from 'expo-sqlite';

let db = null;
let initPromise = null;

async function getDb() {
  if (db) return db;
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

    // Migración segura: agrega columnas sin borrar registros existentes.
    const columns = await db.getAllAsync(
      'PRAGMA table_info(diary_entries);'
    );

    const columnNames = columns.map((column) => column.name);

    if (!columnNames.includes('owner_uid')) {
      await db.execAsync(
        'ALTER TABLE diary_entries ADD COLUMN owner_uid TEXT;'
      );
    }

    if (!columnNames.includes('remote_id')) {
      await db.execAsync(
        'ALTER TABLE diary_entries ADD COLUMN remote_id INTEGER;'
      );
    }

    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_diary_owner_remote
      ON diary_entries(owner_uid, remote_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS
      idx_diary_owner_created
      ON diary_entries(owner_uid, created_at);
    `);

    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    db = null;
    initPromise = null;
    throw error;
  }
}

function requireOwner(ownerUid) {
  if (!ownerUid || typeof ownerUid !== 'string') {
    throw new Error('Se requiere un UID de Firebase para acceder al diario.');
  }
}

export const DatabaseService = {
  async initDatabase() {
    await getDb();
    console.log('✅ Base de datos local inicializada');
  },

  async saveEntryLocally(entry) {
    requireOwner(entry.owner_uid);

    const database = await getDb();

    const result = await database.runAsync(
      `INSERT INTO diary_entries (
        antecedent,
        belief,
        consequence,
        user_emotion,
        detected_emotion,
        detected_distortion,
        confidence_score,
        risk_score,
        flag_riesgo_suicida,
        synced,
        owner_uid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
      [
        entry.antecedent || null,
        entry.belief || null,
        entry.consequence || null,
        entry.user_emotion || null,
        entry.detected_emotion || null,
        entry.detected_distortion || null,
        entry.confidence_score ?? null,
        entry.risk_score ?? null,
        entry.flag_riesgo_suicida ? 1 : 0,
        entry.owner_uid,
      ]
    );

    return result.lastInsertRowId;
  },

  async markAsSynced(localId, remoteId, ownerUid) {
    requireOwner(ownerUid);

    if (remoteId === undefined || remoteId === null) {
      throw new Error('No se puede sincronizar sin el ID remoto del pensamiento.');
    }

    const database = await getDb();

    await database.runAsync(
      `UPDATE diary_entries
       SET synced = 1, remote_id = ?
       WHERE id = ? AND owner_uid = ?;`,
      [Number(remoteId), Number(localId), ownerUid]
    );
  },

  async getUnsyncedEntries(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    return database.getAllAsync(
      `SELECT *
       FROM diary_entries
       WHERE owner_uid = ? AND synced = 0
       ORDER BY created_at ASC;`,
      [ownerUid]
    );
  },

  async getAllEntries(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    return database.getAllAsync(
      `SELECT *
       FROM diary_entries
       WHERE owner_uid = ?
       ORDER BY created_at DESC
       LIMIT 100;`,
      [ownerUid]
    );
  },

  async getEntryById(id, ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    return database.getFirstAsync(
      `SELECT *
       FROM diary_entries
       WHERE id = ? AND owner_uid = ?;`,
      [Number(id), ownerUid]
    );
  },

  async upsertRemoteEntries(entries, ownerUid) {
    requireOwner(ownerUid);

    if (!Array.isArray(entries)) {
      throw new Error('La respuesta del servidor no contiene una lista de pensamientos.');
    }

    const database = await getDb();
    let imported = 0;
    let updated = 0;

    for (const entry of entries) {
      if (entry.id === undefined || entry.id === null) {
        continue;
      }

      const existing = await database.getFirstAsync(
        `SELECT id
         FROM diary_entries
         WHERE owner_uid = ? AND remote_id = ?;`,
        [ownerUid, Number(entry.id)]
      );

      const values = [
        entry.antecedent ?? null,
        entry.belief ?? null,
        entry.consequence ?? null,
        entry.user_emotion ?? null,
        entry.detected_emotion ?? null,
        entry.detected_distortion ?? null,
        entry.confidence_score ?? null,
        entry.risk_score ?? null,
        entry.flag_riesgo_suicida ? 1 : 0,
        entry.created_at ?? new Date().toISOString(),
      ];

      if (existing) {
        await database.runAsync(
          `UPDATE diary_entries
           SET antecedent = ?,
               belief = ?,
               consequence = ?,
               user_emotion = ?,
               detected_emotion = ?,
               detected_distortion = ?,
               confidence_score = ?,
               risk_score = ?,
               flag_riesgo_suicida = ?,
               created_at = ?,
               synced = 1
           WHERE id = ? AND owner_uid = ?;`,
          [...values, existing.id, ownerUid]
        );

        updated++;
      } else {
        await database.runAsync(
          `INSERT INTO diary_entries (
            antecedent,
            belief,
            consequence,
            user_emotion,
            detected_emotion,
            detected_distortion,
            confidence_score,
            risk_score,
            flag_riesgo_suicida,
            created_at,
            synced,
            owner_uid,
            remote_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
          [...values, ownerUid, Number(entry.id)]
        );

        imported++;
      }
    }

    console.log(
      `🔄 Importación terminada: ${imported} nuevos, ${updated} actualizados`
    );

    return { imported, updated };
  },
};
