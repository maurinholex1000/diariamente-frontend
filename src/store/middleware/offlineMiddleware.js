import { actionTypes } from '../actions';
import { DatabaseService } from '../../services/DatabaseService';
import { ApiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';

let isProcessing = false;

async function processAction(action) {
  switch (action.type) {
    case actionTypes.ADD_ENTRY:
      return await ApiService.saveDiaryEntry(action.payload);
    default:
      return null;
  }
}

export const offlineMiddleware = (store) => (next) => async (action) => {
  if (!action.meta?.offline) {
    return next(action);
  }

  const state = store.getState();
  const isOffline = state.connection.isOffline;

  // ⚠️ SIEMPRE guardar en SQLite primero (offline u online)
  const localId = await DatabaseService.saveEntryLocally({
    ...action.payload,
    synced: false,
    queued: isOffline,
  });
  console.log('💾 Guardado en SQLite, ID:', localId);

  if (isOffline) {
    const queuedAction = {
      id: action.payload.id || Date.now().toString(),
      localId,
      action,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    await StorageService.addToOfflineQueue(queuedAction);
    return next(action);
  }

  try {
    const result = await processAction(action);
    if (localId) {
      await DatabaseService.markAsSynced(localId);
      console.log('✅ Marcado como sincronizado:', localId);
    }
    return next({
      type: actionTypes.ADD_ENTRY_SUCCESS,
      payload: { ...action.payload, ...result, localId, synced: true },
    });
  } catch (error) {
    console.log('⚠️ Error enviando al backend, guardado en cola:', error.message);
    const queuedAction = {
      id: action.payload.id || Date.now().toString(),
      localId,
      action,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    await StorageService.addToOfflineQueue(queuedAction);
    return next({ type: actionTypes.ADD_ENTRY_FAILURE, payload: error });
  }
};

export const processOfflineQueue = async (store) => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queue = await StorageService.getOfflineQueue();
    const state = store.getState();
    if (state.connection.isOffline || queue.length === 0) {
      isProcessing = false;
      return;
    }

    for (let i = 0; i < queue.length; i++) {
      const queuedAction = queue[i];
      try {
        const result = await processAction(queuedAction.action);
        await StorageService.removeFromOfflineQueue(queuedAction.id);
        if (queuedAction.localId) {
          await DatabaseService.markAsSynced(queuedAction.localId);
        }
        store.dispatch({
          type: actionTypes.ADD_ENTRY_SUCCESS,
          payload: {
            ...queuedAction.action.payload,
            ...result,
            offlineId: queuedAction.id,
          },
        });
      } catch (error) {
        queuedAction.retries = (queuedAction.retries || 0) + 1;
        if (queuedAction.retries < 5) {
          await StorageService.updateOfflineQueueItem(queuedAction);
        } else {
          await StorageService.removeFromOfflineQueue(queuedAction.id);
          store.dispatch({
            type: actionTypes.ADD_ENTRY_FAILURE,
            payload: { id: queuedAction.id, error: 'Max retries exceeded' },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error procesando cola offline:', error);
  }

  isProcessing = false;
};