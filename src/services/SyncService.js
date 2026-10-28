import NetInfo from '@react-native-community/netinfo';
import { store } from '../store';
import { setOffline, setOnline, syncEntries } from '../store/actions';
import { processOfflineQueue } from '../store/middleware/offlineMiddleware';
import { DatabaseService } from './DatabaseService';
import { ApiService } from './ApiService';

class SyncService {
  constructor() {
    this.isListening = false;
    this.syncInterval = null;
  }

  setup() {
    if (this.isListening) return;
    this.isListening = true;

    NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected) {
        store.dispatch(setOnline());
        this.triggerSync();
      } else {
        store.dispatch(setOffline());
      }
    });

    this.syncInterval = setInterval(() => this.triggerSync(), 5 * 60 * 1000);
    this.triggerSync();
  }

  async triggerSync() {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;
      await this.syncPendingEntries();
      await processOfflineQueue(store);
      store.dispatch(syncEntries());
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  }

  async syncPendingEntries() {
    try {
      const unsynced = await DatabaseService.getUnsyncedEntries();
      for (const entry of unsynced) {
        try {
          await ApiService.saveDiaryEntry(entry);
          await DatabaseService.markAsSynced(entry.id);
        } catch (error) {
          console.log(`Error sincronizando entrada ${entry.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error sincronizando entradas:', error);
    }
  }

  stop() {
    this.isListening = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async forceSync() { await this.triggerSync(); }
}

export const syncService = new SyncService();