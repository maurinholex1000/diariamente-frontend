
import { actionTypes } from '../actions';
import { DatabaseService } from '../../services/DatabaseService';
import { ApiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';
import { auth } from '../../config/firebase';

let isProcessing = false;

async function processAction(action, ownerUid) {
  if (action.type !== actionTypes.ADD_ENTRY) {
    return null;
  }

  if (!ownerUid || auth.currentUser?.uid !== ownerUid) {
    throw new Error('El usuario autenticado no coincide con el propietario.');
  }

  // owner_uid es un dato local: no se necesita enviar al backend.
  const {
    owner_uid,
    ...entryForApi
  } = action.payload;

  if (owner_uid !== ownerUid) {
    throw new Error('El pensamiento pertenece a otra cuenta.');
  }

  return await ApiService.saveDiaryEntry(entryForApi);
}

export const offlineMiddleware = (store) => (next) => async (action) => {
  if (!action.meta?.offline) {
    return next(action);
  }

  const ownerUid = action.payload?.owner_uid;

  if (!ownerUid || auth.currentUser?.uid !== ownerUid) {
    console.error('❌ UID inválido al guardar pensamiento.');
    throw new Error('No se pudo verificar el propietario del pensamiento.');
  }

  const state = store.getState();
  const isOffline = state.connection.isOffline;

  // Siempre guardar primero en SQLite.
  const localId = await DatabaseService.saveEntryLocally({
    ...action.payload,
    synced: false,
  });

  console.log('💾 Pensamiento guardado en SQLite:', localId);

  const queuedAction = {
    id: action.payload.id || Date.now().toString(),
    localId,
    owner_uid: ownerUid,
    action,
    timestamp: new Date().toISOString(),
    retries: 0,
  };

  // Sin conexión: guardar en la cola persistente.
  if (isOffline) {
    await StorageService.addToOfflineQueue(queuedAction);
    return next(action);
  }

  // Con conexión: intentar enviar inmediatamente.
  try {
    const result = await processAction(action, ownerUid);

    if (!result?.id) {
      throw new Error('El servidor no devolvió el ID del pensamiento.');
    }

    await DatabaseService.markAsSynced(
      localId,
      result.id,
      ownerUid
    );

    console.log(
      '✅ Pensamiento sincronizado:',
      localId,
      '->',
      result.id
    );

    return next({
      type: actionTypes.ADD_ENTRY_SUCCESS,
      payload: {
        ...action.payload,
        ...result,
        localId,
        synced: true,
      },
    });
  } catch (error) {
    console.log(
      '⚠️ Error enviando pensamiento. Se conservará en la cola:',
      error.message
    );

    await StorageService.addToOfflineQueue(queuedAction);

    return next({
      type: actionTypes.ADD_ENTRY_FAILURE,
      payload: {
        id: queuedAction.id,
        localId,
        error: error.message,
      },
    });
  }
};

export const processOfflineQueue = async (store, ownerUid) => {
  if (isProcessing || !ownerUid) return;

  if (auth.currentUser?.uid !== ownerUid) {
    console.warn('⚠️ Se canceló la cola: el usuario cambió.');
    return;
  }

  isProcessing = true;

  try {
    const state = store.getState();

    if (state.connection.isOffline) return;

    const queue = await StorageService.getOfflineQueue();

    // Solo procesar elementos que pertenezcan a la cuenta actual.
    // Los registros antiguos sin UID permanecen intactos.
    const userQueue = queue.filter(
      (item) => item.owner_uid === ownerUid
    );

    for (const queuedAction of userQueue) {
      // Comprobar nuevamente antes de cada envío.
      if (auth.currentUser?.uid !== ownerUid) {
        console.warn('⚠️ Se detuvo la cola porque cambió el usuario.');
        break;
      }

      try {
        // Consultar el registro local antes de enviarlo.
        const localEntry = await DatabaseService.getEntryById(
          queuedAction.localId,
          ownerUid
        );

        if (!localEntry) {
          console.warn(
            '⚠️ No se encontró el pensamiento local:',
            queuedAction.localId
          );
          continue;
        }

        // Si ya se sincronizó, retirar la cola sin volver a enviarlo.
        if (localEntry.synced === 1 && localEntry.remote_id) {
          await StorageService.removeFromOfflineQueue(
            queuedAction.id
          );
          continue;
        }

        const result = await processAction(
          queuedAction.action,
          ownerUid
        );

        if (!result?.id) {
          throw new Error('El servidor no devolvió el ID del pensamiento.');
        }

        // Primero actualizar SQLite y después quitarlo de la cola.
        await DatabaseService.markAsSynced(
          queuedAction.localId,
          result.id,
          ownerUid
        );

        await StorageService.removeFromOfflineQueue(
          queuedAction.id
        );

        store.dispatch({
          type: actionTypes.ADD_ENTRY_SUCCESS,
          payload: {
            ...queuedAction.action.payload,
            ...result,
            localId: queuedAction.localId,
            offlineId: queuedAction.id,
            synced: true,
          },
        });

        console.log(
          '✅ Pensamiento pendiente sincronizado:',
          queuedAction.localId,
          '->',
          result.id
        );
      } catch (error) {
        console.error(
          '❌ Error procesando pensamiento pendiente:',
          queuedAction.localId,
          error.message
        );

        const updatedQueueItem = {
          ...queuedAction,
          retries: (queuedAction.retries || 0) + 1,
          lastError: error.message,
          lastAttempt: new Date().toISOString(),
        };

        // No eliminar el pensamiento después de cinco intentos.
        await StorageService.updateOfflineQueueItem(
          updatedQueueItem
        );
      }
    }
  } catch (error) {
    console.error('Error procesando cola offline:', error);
  } finally {
    isProcessing = false;
  }
};
