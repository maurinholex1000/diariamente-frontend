
import NetInfo from '@react-native-community/netinfo';

import { store } from '../store';
import {
  setOffline,
  setOnline,
  syncEntries,
  syncEntriesSuccess,
  syncEntriesFailure,
} from '../store/actions';
import { processOfflineQueue } from '../store/middleware/offlineMiddleware';
import { DatabaseService } from './DatabaseService';
import { ApiService } from './ApiService';
import { auth } from '../config/firebase';

class SyncService {
  constructor() {
    this.isListening = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.unsubscribeNetInfo = null;
    this.ownerUid = null;
    this.runId = 0;
    this.pendingOwnerUid = null;
  }

  setup(ownerUid = auth.currentUser?.uid) {
    if (!ownerUid) {
      console.warn('⚠️ No se inició SyncService: falta el UID.');
      return;
    }

    if (this.isListening && this.ownerUid === ownerUid) {
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.ownerUid = ownerUid;
    this.isListening = true;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (auth.currentUser?.uid !== this.ownerUid) return;

      const isConnected =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      if (isConnected) {
        store.dispatch(setOnline());
        this.triggerSync(this.ownerUid);
      } else {
        store.dispatch(setOffline());
      }
    });

    this.syncInterval = setInterval(() => {
      this.triggerSync(this.ownerUid);
    }, 5 * 60 * 1000);

    this.triggerSync(ownerUid);
  }

  isCurrentRun(ownerUid, runId) {
    return (
      this.ownerUid === ownerUid &&
      auth.currentUser?.uid === ownerUid &&
      this.runId === runId
    );
  }

  async triggerSync(ownerUid = this.ownerUid) {
    if (!ownerUid) return;

    if (this.isSyncing) {
      this.pendingOwnerUid = ownerUid;
      return;
    }

    if (auth.currentUser?.uid !== ownerUid) {
      console.warn('⚠️ Sincronización cancelada: cambió el usuario.');
      return;
    }

    this.isSyncing = true;

    const currentRunId = this.runId;

    store.dispatch(syncEntries());

    try {
      const networkState = await NetInfo.fetch();

      if (!this.isCurrentRun(ownerUid, currentRunId)) return;

      const isConnected =
        networkState.isConnected === true &&
        networkState.isInternetReachable !== false;

      if (!isConnected) {
        store.dispatch(setOffline());
        throw new Error('No hay conexión disponible.');
      }

      store.dispatch(setOnline());

      // 1. Procesar primero la cola offline.
      await processOfflineQueue(store, ownerUid);

      if (!this.isCurrentRun(ownerUid, currentRunId)) return;

      // 2. Sincronizar registros pendientes.
      await this.syncPendingEntries(ownerUid);

      if (!this.isCurrentRun(ownerUid, currentRunId)) return;

      // 3. Descargar registros remotos e incorporarlos a SQLite.
      const downloaded = await this.downloadRemoteEntries(
        ownerUid,
        currentRunId
      );

      if (!downloaded) {
        throw new Error('No se pudieron descargar los pensamientos.');
      }

      if (!this.isCurrentRun(ownerUid, currentRunId)) return;

      // 4. Leer SQLite después de completar la descarga.
      const entries = await DatabaseService.getAllEntries(ownerUid);

      if (!this.isCurrentRun(ownerUid, currentRunId)) return;

      // 5. Publicar los datos actualizados en Redux.
      store.dispatch(syncEntriesSuccess(entries));

      console.log(
        `✅ Sincronización finalizada. Registros locales: ${entries.length}`
      );
    } catch (error) {
      if (this.isCurrentRun(ownerUid, currentRunId)) {
        store.dispatch(syncEntriesFailure(error?.message || error));
        console.error('❌ Error en sincronización:', error);
      }
    } finally {
      this.isSyncing = false;

      const nextOwnerUid = this.pendingOwnerUid;
      this.pendingOwnerUid = null;

      // Si hubo un cambio de cuenta durante la sincronización,
      // iniciar la sincronización pendiente de la cuenta actual.
      if (
        nextOwnerUid &&
        nextOwnerUid === this.ownerUid &&
        auth.currentUser?.uid === nextOwnerUid
      ) {
        this.triggerSync(nextOwnerUid);
      }
    }
  }

  prepareEntryForApi(entry) {
    return {
      antecedent: entry.antecedent ?? null,
      belief: entry.belief ?? null,
      consequence: entry.consequence ?? null,
      user_emotion: entry.user_emotion ?? null,
      detected_emotion: entry.detected_emotion ?? null,
      detected_distortion: entry.detected_distortion ?? null,
      confidence_score: entry.confidence_score ?? null,
      risk_score: entry.risk_score ?? null,
      flag_riesgo_suicida: Boolean(entry.flag_riesgo_suicida),
    };
  }

  async syncPendingEntries(ownerUid) {
    try {
      if (auth.currentUser?.uid !== ownerUid) return;

      const queue = await this.getOfflineQueueForUser(ownerUid);

      const queuedLocalIds = new Set(
        queue
          .map((item) => Number(item.localId))
          .filter((id) => Number.isFinite(id))
      );

      const unsyncedEntries =
        await DatabaseService.getUnsyncedEntries(ownerUid);

      for (const entry of unsyncedEntries) {
        if (
          auth.currentUser?.uid !== ownerUid ||
          this.ownerUid !== ownerUid
        ) {
          break;
        }

        if (queuedLocalIds.has(Number(entry.id))) continue;

        try {
          const result = await ApiService.saveDiaryEntry(
            this.prepareEntryForApi(entry)
          );

          if (
            auth.currentUser?.uid !== ownerUid ||
            this.ownerUid !== ownerUid
          ) {
            break;
          }

          if (!result?.id) {
            throw new Error(
              'El backend no devolvió el ID del pensamiento.'
            );
          }

          await DatabaseService.markAsSynced(
            entry.id,
            result.id,
            ownerUid
          );

          console.log(
            `✅ Registro pendiente sincronizado: ${entry.id} -> ${result.id}`
          );
        } catch (error) {
          console.error(
            `❌ Error sincronizando registro ${entry.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error('Error obteniendo registros pendientes:', error);
    }
  }

  async getOfflineQueueForUser(ownerUid) {
    const { StorageService } = await import('./StorageService');
    const queue = await StorageService.getOfflineQueue();

    return queue.filter((item) => item.owner_uid === ownerUid);
  }

  async downloadRemoteEntries(ownerUid, runId) {
    try {
      if (!this.isCurrentRun(ownerUid, runId)) return false;

      const remoteEntries = await ApiService.getDiaryEntries();

      if (!this.isCurrentRun(ownerUid, runId)) return false;

      if (!Array.isArray(remoteEntries)) {
        console.warn(
          '⚠️ El backend no devolvió una lista de pensamientos.'
        );
        return false;
      }

      const result = await DatabaseService.upsertRemoteEntries(
        remoteEntries,
        ownerUid
      );

      if (!this.isCurrentRun(ownerUid, runId)) return false;

      console.log(
        `⬇️ Pensamientos descargados: ${result.imported}; actualizados: ${result.updated}`
      );

      return true;
    } catch (error) {
      console.error(
        '❌ Error descargando pensamientos del backend:',
        error.message
      );

      return false;
    }
  }

  stop() {
    this.isListening = false;

    // Invalida cualquier sincronización que estuviera en curso.
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
  }

  async forceSync() {
    await this.triggerSync(this.ownerUid || auth.currentUser?.uid);
  }
}

export const syncService = new SyncService();
