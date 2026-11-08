
import NetInfo from '@react-native-community/netinfo';

import { store } from '../store';
import { setOffline, setOnline, syncEntries } from '../store/actions';
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
  }

  setup(ownerUid = auth.currentUser?.uid) {
    if (!ownerUid) {
      console.warn('⚠️ No se inició SyncService: falta el UID.');
      return;
    }

    // Si ya está configurado para la misma cuenta, no duplicar listeners.
    if (this.isListening && this.ownerUid === ownerUid) {
      return;
    }

    // Si cambió la cuenta, detener los listeners anteriores.
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

    // Sincronización inicial.
    this.triggerSync(this.ownerUid);
  }

  async triggerSync(ownerUid = this.ownerUid) {
    if (!ownerUid || this.isSyncing) return;

    if (auth.currentUser?.uid !== ownerUid) {
      console.warn('⚠️ Sincronización cancelada: cambió el usuario.');
      return;
    }

    this.isSyncing = true;

    try {
      const networkState = await NetInfo.fetch();

      const isConnected =
        networkState.isConnected === true &&
        networkState.isInternetReachable !== false;

      if (!isConnected) {
        store.dispatch(setOffline());
        return;
      }

      store.dispatch(setOnline());

      // 1. Procesar primero la cola offline.
      await processOfflineQueue(store, ownerUid);

      if (auth.currentUser?.uid !== ownerUid) return;

      // 2. Sincronizar registros pendientes que no estén en la cola.
      await this.syncPendingEntries(ownerUid);

      if (auth.currentUser?.uid !== ownerUid) return;

      // 3. Descargar registros del backend e incorporarlos a SQLite.
      await this.downloadRemoteEntries(ownerUid);

      if (auth.currentUser?.uid !== ownerUid) return;

      store.dispatch(syncEntries());

      console.log('✅ Sincronización finalizada para:', ownerUid);
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Convierte un registro SQLite al formato esperado por el backend.
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

      // Evitar que un registro presente en la cola se envíe dos veces.
      const queuedLocalIds = new Set(
        queue
          .map((item) => Number(item.localId))
          .filter((id) => Number.isFinite(id))
      );

      const unsyncedEntries =
        await DatabaseService.getUnsyncedEntries(ownerUid);

      for (const entry of unsyncedEntries) {
        if (auth.currentUser?.uid !== ownerUid) break;

        // Este registro ya será procesado por processOfflineQueue.
        if (queuedLocalIds.has(Number(entry.id))) continue;

        try {
          const result = await ApiService.saveDiaryEntry(
            this.prepareEntryForApi(entry)
          );

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

    return queue.filter(
      (item) => item.owner_uid === ownerUid
    );
  }

  async downloadRemoteEntries(ownerUid) {
    try {
      if (auth.currentUser?.uid !== ownerUid) return;

      const remoteEntries = await ApiService.getDiaryEntries();

      if (auth.currentUser?.uid !== ownerUid) return;

      if (!Array.isArray(remoteEntries)) {
        console.warn(
          '⚠️ El backend no devolvió una lista de pensamientos.'
        );
        return;
      }

      const result = await DatabaseService.upsertRemoteEntries(
        remoteEntries,
        ownerUid
      );

      console.log(
        `⬇️ Pensamientos descargados: ${result.imported}; actualizados: ${result.updated}`
      );
    } catch (error) {
      console.error(
        '❌ Error descargando pensamientos del backend:',
        error.message
      );
    }
  }

  stop() {
    this.isListening = false;

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
