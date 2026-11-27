
import NetInfo from '@react-native-community/netinfo';

import { store } from '../store';
import {
  setOffline,
  setOnline,
  syncEntries,
  syncEntriesSuccess,
  syncEntriesFailure,
} from '../store/actions';

import { DatabaseService } from './DatabaseService';
import { ApiService } from './ApiService';
import { DiaryDebugService } from './DiaryDebugService';
import { auth } from '../config/firebase';

const OUTBOX_BATCH_SIZE = 10;
const MAX_OUTBOX_BATCHES_PER_RUN = 100;
const REMOTE_PAGE_SIZE = 200;
const MAX_REMOTE_PAGES = 1000;

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_DURATION_MS = 2 * 60 * 1000;

const RETRY_DELAYS_MS = [
  30 * 1000,
  60 * 1000,
  2 * 60 * 1000,
  5 * 60 * 1000,
  10 * 60 * 1000,
  15 * 60 * 1000,
];

class SyncService {
  constructor() {
    this.isListening = false;
    this.isSyncing = false;

    this.syncInterval = null;
    this.unsubscribeNetInfo = null;

    this.ownerUid = null;
    this.runId = 0;

    this.pendingOwnerUid = null;
    this.activeRun = null;
  }

  setup(ownerUid = auth.currentUser?.uid) {
    if (!ownerUid) {
      DiaryDebugService.warn('sync.setup.skipped', {
        reason: 'missing_owner_uid',
      });

      return;
    }

    if (auth.currentUser?.uid !== ownerUid) {
      DiaryDebugService.warn('sync.setup.skipped', {
        reason: 'session_owner_mismatch',
      });

      return;
    }

    if (
      this.isListening &&
      this.ownerUid === ownerUid
    ) {
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.ownerUid = ownerUid;
    this.isListening = true;

    DiaryDebugService.info('sync.setup.started', {
      ownerUid,
    });

    this.unsubscribeNetInfo = NetInfo.addEventListener(
      (state) => {
        if (
          !this.isListening ||
          auth.currentUser?.uid !== this.ownerUid
        ) {
          return;
        }

        const isConnected =
          state.isConnected === true &&
          state.isInternetReachable !== false;

        if (isConnected) {
          store.dispatch(setOnline());

          DiaryDebugService.info('sync.network.online', {
            ownerUid: this.ownerUid,
          });

          this.triggerSync(this.ownerUid);
        } else {
          store.dispatch(setOffline());

          DiaryDebugService.info('sync.network.offline', {
            ownerUid: this.ownerUid,
          });
        }
      }
    );

    this.syncInterval = setInterval(() => {
      if (this.ownerUid === ownerUid) {
        this.triggerSync(ownerUid);
      }
    }, SYNC_INTERVAL_MS);

    this.triggerSync(ownerUid);
  }

  isCurrentRun(ownerUid, runId) {
    return (
      this.isListening &&
      this.ownerUid === ownerUid &&
      auth.currentUser?.uid === ownerUid &&
      this.runId === runId
    );
  }

  async triggerSync(ownerUid = this.ownerUid) {
    if (!ownerUid) {
      return;
    }

    if (this.isSyncing) {
      this.pendingOwnerUid = ownerUid;

      DiaryDebugService.info('sync.run.queued', {
        ownerUid,
      });

      return;
    }

    if (
      !this.isListening ||
      this.ownerUid !== ownerUid ||
      auth.currentUser?.uid !== ownerUid
    ) {
      DiaryDebugService.warn('sync.run.skipped', {
        ownerUid,
        currentOwnerUid: auth.currentUser?.uid || null,
      });

      return;
    }

    this.isSyncing = true;

    const currentRunId = this.runId;
    const runToken = {
      ownerUid,
      runId: currentRunId,
    };

    this.activeRun = runToken;

    DiaryDebugService.info('sync.run.started', {
      ownerUid,
      runId: currentRunId,
    });

    store.dispatch(syncEntries());

    try {
      const networkState = await NetInfo.fetch();

      if (!this.isCurrentRun(ownerUid, currentRunId)) {
        return;
      }

      const isConnected =
        networkState.isConnected === true &&
        networkState.isInternetReachable !== false;

      if (!isConnected) {
        store.dispatch(setOffline());

        throw new Error('No hay conexión disponible.');
      }

      store.dispatch(setOnline());

      // 1. Procesar las operaciones pendientes de SQLite / Outbox.
      await this.processOutbox(ownerUid, currentRunId);

      if (!this.isCurrentRun(ownerUid, currentRunId)) {
        return;
      }

      // 2. Descargar los pensamientos remotos por páginas.
      const downloaded = await this.downloadRemoteEntries(
        ownerUid,
        currentRunId
      );

      if (!downloaded) {
        throw new Error(
          'No se pudieron descargar todos los pensamientos del servidor.'
        );
      }

      if (!this.isCurrentRun(ownerUid, currentRunId)) {
        return;
      }

      // 3. Cargar SQLite después de completar la sincronización.
      const entries = await DatabaseService.getAllEntries(ownerUid);

      if (!this.isCurrentRun(ownerUid, currentRunId)) {
        return;
      }

      // 4. Publicar los registros de la cuenta actual en Redux.
      store.dispatch(syncEntriesSuccess(entries));

      DiaryDebugService.info('sync.run.completed', {
        ownerUid,
        localEntries: entries.length,
      });

      console.log(
        `✅ Sincronización finalizada. Registros locales: ${entries.length}`
      );
    } catch (error) {
      if (this.isCurrentRun(ownerUid, currentRunId)) {
        store.dispatch(
          syncEntriesFailure(error?.message || String(error))
        );

        DiaryDebugService.error(
          'sync.run.failed',
          error,
          { ownerUid }
        );

        console.error('❌ Error en sincronización:', error);
      }
    } finally {
      /*
       * Solo el proceso que inició esta ejecución puede liberar
       * el indicador global de sincronización.
       *
       * Así evitamos que una ejecución antigua, perteneciente
       * a otra cuenta, interfiera con una nueva.
       */
      if (this.activeRun === runToken) {
        this.activeRun = null;
        this.isSyncing = false;

        const nextOwnerUid = this.pendingOwnerUid;
        this.pendingOwnerUid = null;

        if (
          nextOwnerUid &&
          this.isListening &&
          nextOwnerUid === this.ownerUid &&
          auth.currentUser?.uid === nextOwnerUid
        ) {
          this.triggerSync(nextOwnerUid);
        }
      }
    }
  }

  prepareEntryForApi(entry) {
    if (!entry?.client_entry_id) {
      throw new Error(
        'El pensamiento no tiene client_entry_id. No se puede enviar de forma segura.'
      );
    }

    return {
      client_entry_id: entry.client_entry_id,
      antecedent: entry.antecedent ?? null,
      belief: entry.belief ?? null,
      consequence: entry.consequence ?? null,
      user_emotion: entry.user_emotion ?? null,
      detected_emotion: entry.detected_emotion ?? null,
      detected_distortion: entry.detected_distortion ?? null,
      confidence_score: entry.confidence_score ?? null,
    };
  }

  isPermanentError(error) {
    const status = Number(error?.response?.status);

    if (!status) {
      return false;
    }

    if (
      status === 408 ||
      status === 425 ||
      status === 429
    ) {
      return false;
    }

    if (status >= 500) {
      return false;
    }

    return status >= 400 && status < 500;
  }

  getErrorCode(error) {
    const status = error?.response?.status;

    if (status) {
      return `HTTP_${status}`;
    }

    if (error?.code) {
      return String(error.code).slice(0, 100);
    }

    return 'NETWORK_OR_UNKNOWN_ERROR';
  }

  getRetryDate(attempts = 0) {
    const index = Math.min(
      Math.max(0, Number(attempts) || 0),
      RETRY_DELAYS_MS.length - 1
    );

    const delay = RETRY_DELAYS_MS[index];

    return new Date(Date.now() + delay).toISOString();
  }

  async processOutbox(ownerUid, runId) {
    let processed = 0;
    let batches = 0;

    while (
      batches < MAX_OUTBOX_BATCHES_PER_RUN &&
      this.isCurrentRun(ownerUid, runId)
    ) {
      const operations = await DatabaseService.getOutboxEntries(
        ownerUid,
        OUTBOX_BATCH_SIZE
      );

      if (!this.isCurrentRun(ownerUid, runId)) {
        return;
      }

      if (!operations.length) {
        break;
      }

      batches++;

      DiaryDebugService.info('sync.outbox.batch.loaded', {
        ownerUid,
        batch: batches,
        count: operations.length,
      });

      let claimedInBatch = 0;

      for (const operation of operations) {
        if (!this.isCurrentRun(ownerUid, runId)) {
          return;
        }

        const completed = await this.processOutboxOperation(
          operation,
          ownerUid,
          runId
        );

        if (completed) {
          claimedInBatch++;
          processed++;
        }
      }

      /*
       * Evita un ciclo infinito si las operaciones ya fueron
       * reclamadas por otro proceso o no pudieron procesarse.
       */
      if (claimedInBatch === 0) {
        break;
      }
    }

    DiaryDebugService.info('sync.outbox.completed', {
      ownerUid,
      processed,
      batches,
    });
  }


  async processOutboxOperation(operation, ownerUid, runId) {
    const outboxId = operation?.id;
    const localId = Number(operation?.entity_local_id);

    /*
     * Si no existe un ID de Outbox, no podemos actualizar
     * la operación. Dejamos constancia del problema.
     */
    if (!outboxId) {
      DiaryDebugService.error(
        'sync.outbox.invalid_operation',
        new Error('Operación Outbox sin identificador.'),
        { ownerUid, operation }
      );

      return false;
    }

    /*
     * No modificar operaciones pertenecientes a otra cuenta.
     */
    if (operation.owner_uid !== ownerUid) {
      DiaryDebugService.error(
        'sync.outbox.owner_mismatch',
        new Error('La operación pertenece a otro usuario.'),
        {
          ownerUid,
          operationOwnerUid: operation.owner_uid,
          outboxId,
        }
      );

      return false;
    }

    /*
     * Envía a revisión las operaciones que no podemos procesar.
     * Conservamos el registro local y evitamos que bloquee la cola.
     */
    const moveToReview = async (errorCode, message) => {
      try {
        await DatabaseService.markOutboxReview(
          outboxId,
          ownerUid,
          errorCode
        );

        DiaryDebugService.warn(
          'sync.outbox.invalid_operation_moved_to_review',
          {
            ownerUid,
            outboxId,
            errorCode,
            message,
          }
        );

        return true;
      } catch (databaseError) {
        DiaryDebugService.error(
          'sync.outbox.invalid_operation_review_failed',
          databaseError,
          { ownerUid, outboxId, errorCode }
        );

        return false;
      }
    };

    if (!Number.isSafeInteger(localId) || localId <= 0) {
      return moveToReview(
        'INVALID_LOCAL_ID',
        'El identificador local del pensamiento no es válido.'
      );
    }

    if (
      operation.entity_type !== 'diary_entry' ||
      operation.operation !== 'create'
    ) {
      return moveToReview(
        'UNSUPPORTED_OPERATION',
        'El tipo de entidad o la operación no están soportados.'
      );
    }

    const lockUntil = new Date(
      Date.now() + LOCK_DURATION_MS
    ).toISOString();

    const claimed = await DatabaseService.markOutboxProcessing(
      outboxId,
      ownerUid,
      lockUntil
    );

    if (!claimed) {
      return false;
    }

    DiaryDebugService.info('sync.outbox.processing', {
      ownerUid,
      outboxId,
      localId,
    });

    try {
      if (!this.isCurrentRun(ownerUid, runId)) {
        await DatabaseService.releaseOutboxOperation(
          outboxId,
          ownerUid
        );

        return true;
      }

      const payload = this.prepareEntryForApi(operation);

      const result = await ApiService.saveDiaryEntry(
        payload,
        ownerUid
      );

      if (!result?.id) {
        throw new Error(
          'El backend no devolvió el ID remoto del pensamiento.'
        );
      }

      await DatabaseService.completeOutboxOperation(
        outboxId,
        localId,
        result.id,
        ownerUid,
        result
      );

      DiaryDebugService.info('sync.outbox.server_confirmed', {
        ownerUid,
        outboxId,
        localId,
        remoteId: result.id,
        currentSessionMatches: auth.currentUser?.uid === ownerUid,
      });

      return true;
    } catch (error) {
      /*
       * Si cambió la cuenta o se invalidó esta ejecución,
       * dejamos que venza el bloqueo para recuperar la operación.
       */
      if (!this.isCurrentRun(ownerUid, runId)) {
        DiaryDebugService.warn('sync.outbox.session_changed', {
          ownerUid,
          outboxId,
        });

        return true;
      }

      const errorCode = this.getErrorCode(error);

      try {
        if (this.isPermanentError(error)) {
          await DatabaseService.markOutboxReview(
            outboxId,
            ownerUid,
            errorCode
          );

          DiaryDebugService.warn('sync.outbox.moved_to_review', {
            ownerUid,
            outboxId,
            errorCode,
          });
        } else {
          const nextAttemptAt = this.getRetryDate(
            operation.attempts
          );

          await DatabaseService.retryOutboxOperation(
            outboxId,
            ownerUid,
            nextAttemptAt,
            errorCode
          );

          DiaryDebugService.warn('sync.outbox.retry_scheduled', {
            ownerUid,
            outboxId,
            errorCode,
            nextAttemptAt,
          });
        }
      } catch (databaseError) {
        DiaryDebugService.error(
          'sync.outbox.error_recovery_failed',
          databaseError,
          { ownerUid, outboxId }
        );
      }

      console.error(
        `❌ Error procesando operación ${outboxId}:`,
        error?.message || error
      );

      return true;
    }
  }



async downloadRemoteEntries(ownerUid, runId) {
  try {
    let offset = 0;
    let pageNumber = 0;
    let reachedEnd = false;

    let totalImported = 0;
    let totalUpdated = 0;
    let totalReconciled = 0;

    while (
      pageNumber < MAX_REMOTE_PAGES &&
      this.isCurrentRun(ownerUid, runId)
    ) {
      const remoteEntries = await ApiService.getDiaryEntries(
        REMOTE_PAGE_SIZE,
        offset,
        ownerUid
      );

      if (!this.isCurrentRun(ownerUid, runId)) {
        return false;
      }

      if (!Array.isArray(remoteEntries)) {
        throw new Error(
          'El backend no devolvió una lista válida de pensamientos.'
        );
      }

      pageNumber++;

      if (remoteEntries.length === 0) {
        reachedEnd = true;
        break;
      }

      const result = await DatabaseService.upsertRemoteEntries(
        remoteEntries,
        ownerUid
      );

      if (!this.isCurrentRun(ownerUid, runId)) {
        return false;
      }

      totalImported += result.imported || 0;
      totalUpdated += result.updated || 0;
      totalReconciled += result.reconciled || 0;

      DiaryDebugService.info('sync.download.page_completed', {
        ownerUid,
        page: pageNumber,
        offset,
        received: remoteEntries.length,
        imported: result.imported || 0,
        updated: result.updated || 0,
        reconciled: result.reconciled || 0,
      });

      console.log(
        `⬇️ Página ${pageNumber}: ${remoteEntries.length} pensamientos recibidos.`
      );

      if (remoteEntries.length < REMOTE_PAGE_SIZE) {
        reachedEnd = true;
        break;
      }

      offset += remoteEntries.length;
    }

    if (!this.isCurrentRun(ownerUid, runId)) {
      return false;
    }

    if (!reachedEnd) {
      DiaryDebugService.warn('sync.download.page_limit_reached', {
        ownerUid,
        maxPages: MAX_REMOTE_PAGES,
        lastPage: pageNumber,
        offset,
      });

      throw new Error(
        `La descarga alcanzó el límite de ${MAX_REMOTE_PAGES} páginas sin confirmar que se hayan recibido todos los pensamientos.`
      );
    }

    DiaryDebugService.info('sync.download.completed', {
      ownerUid,
      pages: pageNumber,
      imported: totalImported,
      updated: totalUpdated,
      reconciled: totalReconciled,
    });

    console.log(
      `✅ Descarga finalizada. Importados: ${totalImported}; actualizados: ${totalUpdated}; reconciliados: ${totalReconciled}.`
    );

    return this.isCurrentRun(ownerUid, runId);
  } catch (error) {
    DiaryDebugService.error(
      'sync.download.failed',
      error,
      { ownerUid }
    );

    console.error(
      '❌ Error descargando pensamientos del backend:',
      error?.message || error
    );

    return false;
  }
}


  stop() {
    const previousOwnerUid = this.ownerUid;

    this.isListening = false;

    // Invalida las ejecuciones pertenecientes a la sesión anterior.
    this.runId += 1;

    this.pendingOwnerUid = null;

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.ownerUid = null;

    DiaryDebugService.info('sync.stopped', {
      previousOwnerUid,
      runId: this.runId,
    });
  }

  async forceSync() {
    const ownerUid = this.ownerUid || auth.currentUser?.uid;

    if (!ownerUid) {
      return;
    }

    if (!this.isListening) {
      this.setup(ownerUid);
      return;
    }

    await this.triggerSync(ownerUid);
  }
}

export const syncService = new SyncService();
