
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DiaryDebugService } from './DiaryDebugService';

const DATABASE_NAME = 'diariamente.db';
const DATABASE_SCHEMA_VERSION = 1;

const OUTBOX_ENTITY_DIARY = 'diary_entry';
const OUTBOX_OPERATION_CREATE = 'create';

const OUTBOX_STATUS_PENDING = 'pending';
const OUTBOX_STATUS_PROCESSING = 'processing';
const OUTBOX_STATUS_REVIEW = 'review';

let db = null;
let initPromise = null;

const nowIso = () => new Date().toISOString();

const generateId = () => Crypto.randomUUID();

function requireOwner(ownerUid) {
  if (!ownerUid || typeof ownerUid !== 'string') {
    throw new Error(
      'Se requiere un UID de Firebase para acceder al diario.'
    );
  }
}

function requireClientEntryId(clientEntryId) {
  if (
    typeof clientEntryId !== 'string' ||
    !clientEntryId.trim() ||
    clientEntryId.length > 36
  ) {
    throw new Error(
      'El identificador único del pensamiento no es válido.'
    );
  }
}

function requireRemoteId(remoteId) {
  const parsedId = Number(remoteId);

  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    throw new Error(
      'El identificador remoto del pensamiento no es válido.'
    );
  }

  return parsedId;
}

function getChanges(result) {
  return Number(result?.changes ?? 0);
}

async function getColumnNames(database, tableName) {
  const columns = await database.getAllAsync(
    `PRAGMA table_info(${tableName});`
  );

  return columns.map((column) => column.name);
}

async function addColumnIfMissing(
  database,
  tableName,
  columnName,
  definition
) {
  const columns = await getColumnNames(database, tableName);

  if (!columns.includes(columnName)) {
    await database.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`
    );
  }
}

async function migrateDatabase(database) {
  await database.withTransactionAsync(async () => {
    await database.execAsync(`
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

    await addColumnIfMissing(
      database,
      'diary_entries',
      'owner_uid',
      'TEXT'
    );

    await addColumnIfMissing(
      database,
      'diary_entries',
      'remote_id',
      'INTEGER'
    );

    await addColumnIfMissing(
      database,
      'diary_entries',
      'client_entry_id',
      'TEXT'
    );

    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_diary_owner_remote
      ON diary_entries(owner_uid, remote_id);
    `);

    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_diary_owner_client_entry
      ON diary_entries(owner_uid, client_entry_id);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS
      idx_diary_owner_created
      ON diary_entries(owner_uid, created_at);
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        owner_uid TEXT,
        entity_type TEXT NOT NULL,
        entity_local_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        next_attempt_at TEXT,
        locked_until TEXT,
        last_error_code TEXT,
        legacy_source INTEGER NOT NULL DEFAULT 0
      );
    `);

    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_outbox_entity_operation
      ON sync_outbox(entity_type, entity_local_id, operation);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS
      idx_outbox_owner_status
      ON sync_outbox(owner_uid, status);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS
      idx_outbox_next_attempt
      ON sync_outbox(status, next_attempt_at);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS
      idx_outbox_locked
      ON sync_outbox(status, locked_until);
    `);

    /*
     * Migración conservadora:
     *
     * Los registros antiguos que todavía no estaban sincronizados
     * se conservan y se envían a revisión.
     *
     * No se envían automáticamente porque podrían no tener un
     * client_entry_id válido o podrían pertenecer a una sesión
     * anterior.
     */
    await database.runAsync(
      `
        INSERT OR IGNORE INTO sync_outbox (
          id,
          owner_uid,
          entity_type,
          entity_local_id,
          operation,
          status,
          attempts,
          created_at,
          legacy_source
        )
        SELECT
          lower(hex(randomblob(16))),
          owner_uid,
          ?,
          id,
          ?,
          ?,
          0,
          ?,
          1
        FROM diary_entries
        WHERE synced = 0;
      `,
      [
        OUTBOX_ENTITY_DIARY,
        OUTBOX_OPERATION_CREATE,
        OUTBOX_STATUS_REVIEW,
        nowIso(),
      ]
    );

    await database.execAsync(
      `PRAGMA user_version = ${DATABASE_SCHEMA_VERSION};`
    );
  });

  DiaryDebugService.info('sqlite.migration.completed', {
    schemaVersion: DATABASE_SCHEMA_VERSION,
  });
}

async function getDb() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

    await migrateDatabase(database);

    db = database;

    DiaryDebugService.info('sqlite.initialized', {
      schemaVersion: DATABASE_SCHEMA_VERSION,
    });

    return database;
  })();

  try {
    return await initPromise;
  } catch (error) {
    db = null;
    initPromise = null;

    DiaryDebugService.error(
      'sqlite.initialization.failed',
      error
    );

    throw error;
  }
}

function normalizeEntryValues(entry) {
  return [
    entry.antecedent ?? null,
    entry.belief ?? null,
    entry.consequence ?? null,
    entry.user_emotion ?? null,
    entry.detected_emotion ?? null,
    entry.detected_distortion ?? null,
    entry.confidence_score ?? null,
    entry.risk_score ?? null,
    entry.flag_riesgo_suicida ? 1 : 0,
    entry.crisis_notified ? 1 : 0,
  ];
}

export const DatabaseService = {
  async initDatabase() {
    await getDb();

    DiaryDebugService.info('sqlite.ready');
  },

  async saveEntryWithOutbox(entry) {
    requireOwner(entry?.owner_uid);

    const database = await getDb();

    const clientEntryId =
      entry.client_entry_id || generateId();

    requireClientEntryId(clientEntryId);

    const outboxId = generateId();

    const createdAt = entry.created_at || nowIso();

    DiaryDebugService.info('sqlite.outbox.save.started', {
      ownerUid: entry.owner_uid,
      clientEntryId,
    });

    let localId = null;

    await database.withTransactionAsync(async () => {
      const existing = await database.getFirstAsync(
        `
          SELECT id
          FROM diary_entries
          WHERE owner_uid = ?
            AND client_entry_id = ?;
        `,
        [entry.owner_uid, clientEntryId]
      );

      if (existing) {
        throw new Error(
          'Ya existe un pensamiento local con ese identificador.'
        );
      }

      const result = await database.runAsync(
        `
          INSERT INTO diary_entries (
            antecedent,
            belief,
            consequence,
            user_emotion,
            detected_emotion,
            detected_distortion,
            confidence_score,
            risk_score,
            flag_riesgo_suicida,
            crisis_notified,
            synced,
            owner_uid,
            client_entry_id,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);
        `,
        [
          ...normalizeEntryValues(entry),
          entry.owner_uid,
          clientEntryId,
          createdAt,
        ]
      );

      localId = Number(result.lastInsertRowId);

      await database.runAsync(
        `
          INSERT INTO sync_outbox (
            id,
            owner_uid,
            entity_type,
            entity_local_id,
            operation,
            status,
            attempts,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, ?);
        `,
        [
          outboxId,
          entry.owner_uid,
          OUTBOX_ENTITY_DIARY,
          localId,
          OUTBOX_OPERATION_CREATE,
          OUTBOX_STATUS_PENDING,
          nowIso(),
        ]
      );
    });

    DiaryDebugService.info('sqlite.outbox.save.completed', {
      ownerUid: entry.owner_uid,
      localId,
      clientEntryId,
      outboxId,
    });

    return {
      localId,
      clientEntryId,
      outboxId,
    };
  },

  /*
   * Método legacy.
   * Se conserva para no romper posibles consumidores existentes.
   * Los nuevos pensamientos deben utilizar saveEntryWithOutbox().
   */
  async saveEntryLocally(entry) {
    requireOwner(entry?.owner_uid);

    const database = await getDb();

    DiaryDebugService.info('sqlite.save.started', {
      clientId: entry.id || null,
      ownerUid: entry.owner_uid,
    });

    try {
      const result = await database.runAsync(
        `
          INSERT INTO diary_entries (
            antecedent,
            belief,
            consequence,
            user_emotion,
            detected_emotion,
            detected_distortion,
            confidence_score,
            risk_score,
            flag_riesgo_suicida,
            crisis_notified,
            synced,
            owner_uid,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);
        `,
        [
          ...normalizeEntryValues(entry),
          entry.owner_uid,
          entry.created_at || nowIso(),
        ]
      );

      DiaryDebugService.info('sqlite.save.completed', {
        localId: result.lastInsertRowId,
        synced: false,
      });

      return result.lastInsertRowId;
    } catch (error) {
      DiaryDebugService.error(
        'sqlite.save.failed',
        error,
        { ownerUid: entry.owner_uid }
      );

      throw error;
    }
  },

  async markAsSynced(localId, remoteId, ownerUid) {
    requireOwner(ownerUid);

    const validRemoteId = requireRemoteId(remoteId);

    const database = await getDb();

    const result = await database.runAsync(
      `
        UPDATE diary_entries
        SET synced = 1,
            remote_id = ?
        WHERE id = ?
          AND owner_uid = ?;
      `,
      [validRemoteId, Number(localId), ownerUid]
    );

    if (getChanges(result) !== 1) {
      throw new Error(
        'No se pudo confirmar la sincronización del pensamiento local.'
      );
    }

    DiaryDebugService.info('sqlite.sync.confirmed', {
      localId: Number(localId),
      remoteId: validRemoteId,
      ownerUid,
    });
  },

  async completeOutboxOperation(
    outboxId,
    localId,
    remoteId,
    ownerUid,
    remoteEntry = null
  ) {
    requireOwner(ownerUid);

    const validRemoteId = requireRemoteId(remoteId);

    const database = await getDb();

    await database.withTransactionAsync(async () => {
      const localEntry = await database.getFirstAsync(
        `
          SELECT id, client_entry_id
          FROM diary_entries
          WHERE id = ?
            AND owner_uid = ?;
        `,
        [Number(localId), ownerUid]
      );

      if (!localEntry) {
        throw new Error(
          'No se encontró el pensamiento local que se intenta confirmar.'
        );
      }

      const updateResult = await database.runAsync(
        `
          UPDATE diary_entries
          SET synced = 1,
              remote_id = ?,
              risk_score = COALESCE(?, risk_score),
              flag_riesgo_suicida = COALESCE(?, flag_riesgo_suicida),
              crisis_notified = COALESCE(?, crisis_notified)
          WHERE id = ?
            AND owner_uid = ?
            AND (remote_id IS NULL OR remote_id = ?);
        `,
        [
          validRemoteId,
          remoteEntry?.risk_score ?? null,
          remoteEntry?.flag_riesgo_suicida === undefined
            ? null
            : remoteEntry.flag_riesgo_suicida
              ? 1
              : 0,
          remoteEntry?.crisis_notified === undefined
            ? null
            : remoteEntry.crisis_notified
              ? 1
              : 0,
          Number(localId),
          ownerUid,
          validRemoteId,
        ]
      );

      if (getChanges(updateResult) !== 1) {
        throw new Error(
          'No se pudo actualizar el pensamiento local con su ID remoto.'
        );
      }

      const deleteResult = await database.runAsync(
        `
          DELETE FROM sync_outbox
          WHERE id = ?
            AND owner_uid = ?
            AND entity_local_id = ?;
        `,
        [outboxId, ownerUid, Number(localId)]
      );

      if (getChanges(deleteResult) !== 1) {
        throw new Error(
          'No se pudo eliminar la operación confirmada de la Outbox.'
        );
      }
    });

    DiaryDebugService.info('sqlite.outbox.completed', {
      outboxId,
      localId: Number(localId),
      remoteId: validRemoteId,
      ownerUid,
    });
  },

  async getOutboxEntries(ownerUid, limit = 10) {
    requireOwner(ownerUid);

    const database = await getDb();

    const currentTime = nowIso();

    return database.getAllAsync(
      `
        SELECT
          outbox.*,
          diary_entries.antecedent,
          diary_entries.belief,
          diary_entries.consequence,
          diary_entries.user_emotion,
          diary_entries.detected_emotion,
          diary_entries.detected_distortion,
          diary_entries.confidence_score,
          diary_entries.risk_score,
          diary_entries.flag_riesgo_suicida,
          diary_entries.crisis_notified,
          diary_entries.created_at AS entry_created_at,
          diary_entries.client_entry_id,
          diary_entries.remote_id
        FROM sync_outbox AS outbox
        INNER JOIN diary_entries
          ON diary_entries.id = outbox.entity_local_id
          AND diary_entries.owner_uid = outbox.owner_uid
        WHERE outbox.owner_uid = ?
          AND outbox.entity_type = ?
          AND (
            (
              outbox.status = ?
              AND (
                outbox.next_attempt_at IS NULL
                OR outbox.next_attempt_at <= ?
              )
            )
            OR
            (
              outbox.status = ?
              AND (
                outbox.locked_until IS NULL
                OR outbox.locked_until <= ?
              )
            )
          )
        ORDER BY outbox.created_at ASC
        LIMIT ?;
      `,
      [
        ownerUid,
        OUTBOX_ENTITY_DIARY,
        OUTBOX_STATUS_PENDING,
        currentTime,
        OUTBOX_STATUS_PROCESSING,
        currentTime,
        Math.max(1, Number(limit) || 10),
      ]
    );
  },

  async markOutboxProcessing(outboxId, ownerUid, lockUntil) {
    requireOwner(ownerUid);

    const database = await getDb();

    const result = await database.runAsync(
      `
        UPDATE sync_outbox
        SET status = ?,
            locked_until = ?
        WHERE id = ?
          AND owner_uid = ?
          AND (
            status = ?
            OR (
              status = ?
              AND (
                locked_until IS NULL
                OR locked_until <= ?
              )
            )
          );
      `,
      [
        OUTBOX_STATUS_PROCESSING,
        lockUntil,
        outboxId,
        ownerUid,
        OUTBOX_STATUS_PENDING,
        OUTBOX_STATUS_PROCESSING,
        nowIso(),
      ]
    );

    const claimed = getChanges(result) === 1;

    DiaryDebugService.info('sqlite.outbox.claim', {
      outboxId,
      ownerUid,
      claimed,
    });

    return claimed;
  },

  async retryOutboxOperation(
    outboxId,
    ownerUid,
    nextAttemptAt,
    errorCode
  ) {
    requireOwner(ownerUid);

    const database = await getDb();

    const result = await database.runAsync(
      `
        UPDATE sync_outbox
        SET status = ?,
            attempts = attempts + 1,
            next_attempt_at = ?,
            locked_until = NULL,
            last_error_code = ?
        WHERE id = ?
          AND owner_uid = ?
          AND status = ?;
      `,
      [
        OUTBOX_STATUS_PENDING,
        nextAttemptAt,
        errorCode || 'UNKNOWN_ERROR',
        outboxId,
        ownerUid,
        OUTBOX_STATUS_PROCESSING,
      ]
    );

    if (getChanges(result) !== 1) {
      throw new Error(
        'No se pudo registrar el reintento de la operación offline.'
      );
    }

    DiaryDebugService.info('sqlite.outbox.retry_scheduled', {
      outboxId,
      ownerUid,
      nextAttemptAt,
      errorCode,
    });
  },

  async releaseOutboxOperation(outboxId, ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    const result = await database.runAsync(
      `
        UPDATE sync_outbox
        SET status = ?,
            locked_until = NULL
        WHERE id = ?
          AND owner_uid = ?
          AND status = ?;
      `,
      [
        OUTBOX_STATUS_PENDING,
        outboxId,
        ownerUid,
        OUTBOX_STATUS_PROCESSING,
      ]
    );

    const released = getChanges(result) === 1;

    DiaryDebugService.info('sqlite.outbox.released', {
      outboxId,
      ownerUid,
      released,
    });

    return released;
  },

  async markOutboxReview(outboxId, ownerUid, errorCode) {
    requireOwner(ownerUid);

    const database = await getDb();

    const result = await database.runAsync(
      `
        UPDATE sync_outbox
        SET status = ?,
            locked_until = NULL,
            next_attempt_at = NULL,
            last_error_code = ?
        WHERE id = ?
          AND owner_uid = ?
          AND status IN (?, ?);
      `,
      [
        OUTBOX_STATUS_REVIEW,
        errorCode || 'PERMANENT_ERROR',
        outboxId,
        ownerUid,
        OUTBOX_STATUS_PENDING,
        OUTBOX_STATUS_PROCESSING,
      ]
    );

    if (getChanges(result) !== 1) {
      throw new Error(
        'No se pudo enviar la operación a revisión.'
      );
    }

    DiaryDebugService.info('sqlite.outbox.review_required', {
      outboxId,
      ownerUid,
      errorCode,
    });
  },

  async getOutboxReviewEntries(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    return database.getAllAsync(
      `
        SELECT
          outbox.*,
          diary_entries.antecedent,
          diary_entries.belief,
          diary_entries.consequence,
          diary_entries.created_at AS entry_created_at,
          diary_entries.client_entry_id
        FROM sync_outbox AS outbox
        LEFT JOIN diary_entries
          ON diary_entries.id = outbox.entity_local_id
          AND diary_entries.owner_uid = outbox.owner_uid
        WHERE outbox.owner_uid = ?
          AND outbox.status = ?
        ORDER BY outbox.created_at ASC;
      `,
      [ownerUid, OUTBOX_STATUS_REVIEW]
    );
  },

  async getOutboxSummary(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    const rows = await database.getAllAsync(
      `
        SELECT status, COUNT(*) AS total
        FROM sync_outbox
        WHERE owner_uid = ?
        GROUP BY status;
      `,
      [ownerUid]
    );

    const summary = {
      pending: 0,
      processing: 0,
      review: 0,
      total: 0,
    };

    for (const row of rows) {
      const count = Number(row.total || 0);

      if (Object.prototype.hasOwnProperty.call(summary, row.status)) {
        summary[row.status] = count;
      }

      summary.total += count;
    }

    return summary;
  },

  async getUnsyncedEntries(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    const entries = await database.getAllAsync(
      `
        SELECT *
        FROM diary_entries
        WHERE owner_uid = ?
          AND synced = 0
        ORDER BY created_at ASC;
      `,
      [ownerUid]
    );

    DiaryDebugService.info('sqlite.pending.loaded', {
      ownerUid,
      count: entries.length,
    });

    return entries;
  },

  async getAllEntries(ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    const entries = await database.getAllAsync(
      `
        SELECT *
        FROM diary_entries
        WHERE owner_uid = ?
        ORDER BY created_at DESC, id DESC;
      `,
      [ownerUid]
    );

    DiaryDebugService.info('sqlite.entries.loaded', {
      ownerUid,
      count: entries.length,
    });

    return entries;
  },

  async getEntryById(id, ownerUid) {
    requireOwner(ownerUid);

    const database = await getDb();

    return database.getFirstAsync(
      `
        SELECT *
        FROM diary_entries
        WHERE id = ?
          AND owner_uid = ?;
      `,
      [Number(id), ownerUid]
    );
  },


async upsertRemoteEntries(entries, ownerUid) {
  requireOwner(ownerUid);

  if (!Array.isArray(entries)) {
    throw new Error(
      'La respuesta del servidor no contiene una lista de pensamientos.'
    );
  }

  const database = await getDb();

  let imported = 0;
  let updated = 0;
  let reconciled = 0;

  await database.withTransactionAsync(async () => {
    for (const entry of entries) {
      if (entry?.id === undefined || entry?.id === null) {
        continue;
      }

      const remoteId = requireRemoteId(entry.id);

      const clientEntryId =
        typeof entry.client_entry_id === 'string' &&
        entry.client_entry_id.trim()
          ? entry.client_entry_id
          : null;

      /*
       * Primera búsqueda: identificador único del cliente.
       */
      let existing = null;
      let matchedByClientEntryId = false;

      if (clientEntryId) {
        existing = await database.getFirstAsync(
          `
            SELECT *
            FROM diary_entries
            WHERE owner_uid = ?
              AND client_entry_id = ?;
          `,
          [ownerUid, clientEntryId]
        );

        matchedByClientEntryId = Boolean(existing);
      }

      /*
       * Segunda búsqueda: identificador remoto.
       */
      if (!existing) {
        existing = await database.getFirstAsync(
          `
            SELECT *
            FROM diary_entries
            WHERE owner_uid = ?
              AND remote_id = ?;
          `,
          [ownerUid, remoteId]
        );
      }

      const createdAt = entry.created_at || nowIso();

      const remoteRiskScore = entry.risk_score ?? null;

      const remoteRiskFlag =
        entry.flag_riesgo_suicida === undefined
          ? null
          : entry.flag_riesgo_suicida
            ? 1
            : 0;

      const remoteCrisisNotified =
        entry.crisis_notified === undefined
          ? null
          : entry.crisis_notified
            ? 1
            : 0;

      if (existing) {
        /*
         * Si los dos identificadores existen y no coinciden,
         * hay una inconsistencia de identidad que no debemos
         * resolver sobrescribiendo datos locales.
         */
        if (
          clientEntryId &&
          existing.client_entry_id &&
          clientEntryId !== existing.client_entry_id
        ) {
          throw new Error(
            `Inconsistencia de identidad: el pensamiento remoto ${remoteId} tiene un client_entry_id diferente del registro local.`
          );
        }

        /*
         * Buscar una operación de creación pendiente.
         */
        const pendingOperation = await database.getFirstAsync(
          `
            SELECT id
            FROM sync_outbox
            WHERE owner_uid = ?
              AND entity_type = ?
              AND entity_local_id = ?
              AND operation = ?;
          `,
          [
            ownerUid,
            OUTBOX_ENTITY_DIARY,
            existing.id,
            OUTBOX_OPERATION_CREATE,
          ]
        );

        if (pendingOperation) {
          /*
           * Una operación pendiente solamente puede eliminarse
           * cuando la coincidencia se hizo por client_entry_id
           * y ambos identificadores son exactamente iguales.
           */
          if (
            !matchedByClientEntryId ||
            !clientEntryId ||
            existing.client_entry_id !== clientEntryId
          ) {
            throw new Error(
              `No se puede reconciliar el pensamiento remoto ${remoteId}: no existe coincidencia exacta de client_entry_id con la operación pendiente.`
            );
          }

          const updateResult = await database.runAsync(
            `
              UPDATE diary_entries
              SET remote_id = ?,
                  synced = 1,
                  risk_score = COALESCE(?, risk_score),
                  flag_riesgo_suicida =
                    COALESCE(?, flag_riesgo_suicida),
                  crisis_notified =
                    COALESCE(?, crisis_notified)
              WHERE id = ?
                AND owner_uid = ?
                AND (remote_id IS NULL OR remote_id = ?);
            `,
            [
              remoteId,
              remoteRiskScore,
              remoteRiskFlag,
              remoteCrisisNotified,
              existing.id,
              ownerUid,
              remoteId,
            ]
          );

          if (getChanges(updateResult) !== 1) {
            throw new Error(
              'No se pudo reconciliar un pensamiento local con su registro remoto.'
            );
          }

          const deleteResult = await database.runAsync(
            `
              DELETE FROM sync_outbox
              WHERE id = ?
                AND owner_uid = ?;
            `,
            [pendingOperation.id, ownerUid]
          );

          if (getChanges(deleteResult) !== 1) {
            throw new Error(
              'No se pudo retirar la operación pendiente después de confirmar la sincronización.'
            );
          }

          reconciled++;
          continue;
        }

        /*
         * Registro existente y sin operación pendiente:
         * el servidor es la fuente de verdad.
         */
        const updateResult = await database.runAsync(
          `
            UPDATE diary_entries
            SET antecedent = ?,
                belief = ?,
                consequence = ?,
                user_emotion = ?,
                detected_emotion = ?,
                detected_distortion = ?,
                confidence_score = ?,
                risk_score = ?,
                flag_riesgo_suicida = ?,
                crisis_notified = ?,
                created_at = ?,
                remote_id = ?,
                synced = 1
            WHERE id = ?
              AND owner_uid = ?;
          `,
          [
            entry.antecedent ?? null,
            entry.belief ?? null,
            entry.consequence ?? null,
            entry.user_emotion ?? null,
            entry.detected_emotion ?? null,
            entry.detected_distortion ?? null,
            entry.confidence_score ?? null,
            entry.risk_score ?? null,
            entry.flag_riesgo_suicida ? 1 : 0,
            entry.crisis_notified ? 1 : 0,
            createdAt,
            remoteId,
            existing.id,
            ownerUid,
          ]
        );

        if (getChanges(updateResult) !== 1) {
          throw new Error(
            'No se pudo actualizar un pensamiento descargado del servidor.'
          );
        }

        updated++;
        continue;
      }

      /*
       * No existe coincidencia local: importar el pensamiento.
       */
      await database.runAsync(
        `
          INSERT INTO diary_entries (
            antecedent,
            belief,
            consequence,
            user_emotion,
            detected_emotion,
            detected_distortion,
            confidence_score,
            risk_score,
            flag_riesgo_suicida,
            crisis_notified,
            created_at,
            synced,
            owner_uid,
            remote_id,
            client_entry_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);
        `,
        [
          entry.antecedent ?? null,
          entry.belief ?? null,
          entry.consequence ?? null,
          entry.user_emotion ?? null,
          entry.detected_emotion ?? null,
          entry.detected_distortion ?? null,
          entry.confidence_score ?? null,
          entry.risk_score ?? null,
          entry.flag_riesgo_suicida ? 1 : 0,
          entry.crisis_notified ? 1 : 0,
          createdAt,
          ownerUid,
          remoteId,
          clientEntryId,
        ]
      );

      imported++;
    }
  });

  DiaryDebugService.info('sqlite.remote_import.completed', {
    ownerUid,
    imported,
    updated,
    reconciled,
  });

  return {
    imported,
    updated,
    reconciled,
  };
},
};
