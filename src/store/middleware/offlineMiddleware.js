
import { actionTypes } from '../actions';
import { DatabaseService } from '../../services/DatabaseService';
import { DiaryDebugService } from '../../services/DiaryDebugService';
import { auth } from '../../config/firebase';

function isValidOwner(ownerUid) {
  return (
    typeof ownerUid === 'string' &&
    ownerUid.trim().length > 0
  );
}

export const offlineMiddleware = (store) => (next) => async (action) => {
  /*
   * Solo intervenimos en acciones marcadas para persistencia offline.
   * Las demás acciones siguen su flujo normal de Redux.
   */
  if (!action.meta?.offline) {
    return next(action);
  }

  const entry = action.payload;
  const ownerUid = entry?.owner_uid;

  DiaryDebugService.info('offline.middleware.action_received', {
    actionType: action.type,
    clientId: entry?.id || null,
    ownerUid: ownerUid || null,
  });

  /*
   * Validación inicial de identidad.
   */
  if (
    !isValidOwner(ownerUid) ||
    auth.currentUser?.uid !== ownerUid
  ) {
    const error = new Error(
      'No se pudo verificar el propietario del pensamiento.'
    );

    DiaryDebugService.error(
      'offline.middleware.invalid_owner',
      error,
      {
        ownerUid: ownerUid || null,
        currentOwnerUid: auth.currentUser?.uid || null,
      }
    );

    next({
      type: actionTypes.ADD_ENTRY_FAILURE,
      payload: {
        id: entry?.id || null,
        error: error.message,
      },
    });

    throw error;
  }

  let savedEntry;

  /*
   * Guardamos el pensamiento y creamos su operación Outbox
   * dentro de una misma transacción SQLite.
   *
   * Si esta operación falla, no se considera guardado.
   */
  try {
    savedEntry = await DatabaseService.saveEntryWithOutbox({
      ...entry,
      owner_uid: ownerUid,
    });

    DiaryDebugService.info('offline.middleware.local_save_completed', {
      ownerUid,
      localId: savedEntry.localId,
      clientEntryId: savedEntry.clientEntryId,
      outboxId: savedEntry.outboxId,
    });

    console.log(
      '💾 Pensamiento guardado localmente:',
      savedEntry.localId
    );
  } catch (error) {
    DiaryDebugService.error(
      'offline.middleware.local_save_failed',
      error,
      {
        ownerUid,
        clientId: entry?.id || null,
      }
    );

    next({
      type: actionTypes.ADD_ENTRY_FAILURE,
      payload: {
        id: entry?.id || null,
        error: error?.message || 'No se pudo guardar el pensamiento.',
      },
    });

    throw error;
  }

  /*
   * La operación SQLite ya terminó correctamente.
   *
   * Si el usuario cambió de cuenta durante el guardado, no
   * despachamos el pensamiento al Redux de la nueva sesión.
   *
   * El registro permanece conservado bajo el owner_uid original
   * y podrá recuperarse cuando esa cuenta vuelva a iniciar sesión.
   */
  if (auth.currentUser?.uid !== ownerUid) {
    DiaryDebugService.warn(
      'offline.middleware.owner_changed_after_save',
      {
        savedOwnerUid: ownerUid,
        currentOwnerUid: auth.currentUser?.uid || null,
        localId: savedEntry.localId,
      }
    );

    return {
      saved: true,
      ownerChanged: true,
      localId: savedEntry.localId,
      clientEntryId: savedEntry.clientEntryId,
    };
  }

  /*
   * El pensamiento se guardó correctamente.
   *
   * No se envía al backend desde este middleware.
   * SyncService procesará la Outbox cuando corresponda.
   */
  const successAction = {
    type: actionTypes.ADD_ENTRY_SUCCESS,
    payload: {
      ...entry,
      localId: savedEntry.localId,
      client_entry_id: savedEntry.clientEntryId,
      outboxId: savedEntry.outboxId,
      owner_uid: ownerUid,
      synced: false,
    },
  };

  DiaryDebugService.info('offline.middleware.success_dispatched', {
    ownerUid,
    localId: savedEntry.localId,
    clientEntryId: savedEntry.clientEntryId,
    outboxId: savedEntry.outboxId,
  });

  return next(successAction);
};
