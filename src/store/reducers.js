
import { combineReducers } from '@reduxjs/toolkit';
import { actionTypes } from './actions';

/*
 * ==========================================
 * ENTRIES
 * ==========================================
 *
 * Mantiene los pensamientos disponibles en Redux.
 *
 * Identificadores:
 * - id: identificador del registro en SQLite.
 * - client_entry_id: UUID estable para sincronización.
 * - remote_id: identificador del backend.
 */

const entriesReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.ADD_ENTRY_SUCCESS: {
      const payload = action.payload;

      if (!payload || typeof payload !== 'object') {
        return state;
      }

      const newEntry = {
        ...payload,
        synced: payload.synced === true,
      };

      /*
       * Evitamos duplicados por identificador local
       * o por UUID de sincronización.
       */
      const alreadyExists = state.some((entry) => {
        const sameLocalId =
          newEntry.localId != null &&
          entry.localId != null &&
          Number(entry.localId) === Number(newEntry.localId);

        const sameClientEntryId =
          newEntry.client_entry_id &&
          entry.client_entry_id &&
          newEntry.client_entry_id === entry.client_entry_id;

        return sameLocalId || sameClientEntryId;
      });

      if (alreadyExists) {
        return state.map((entry) => {
          const sameLocalId =
            newEntry.localId != null &&
            entry.localId != null &&
            Number(entry.localId) === Number(newEntry.localId);

          const sameClientEntryId =
            newEntry.client_entry_id &&
            entry.client_entry_id &&
            newEntry.client_entry_id === entry.client_entry_id;

          if (sameLocalId || sameClientEntryId) {
            return {
              ...entry,
              ...newEntry,
            };
          }

          return entry;
        });
      }

      return [newEntry, ...state];
    }

    case actionTypes.SYNC_ENTRIES_SUCCESS: {
      /*
       * SQLite es la fuente local de verdad.
       * Una sincronización completa reemplaza el estado
       * de Redux por los registros obtenidos de SQLite.
       */
      if (!Array.isArray(action.payload)) {
        return state;
      }

      return action.payload;
    }

    default:
      return state;
  }
};

/*
 * ==========================================
 * OFFLINE QUEUE
 * ==========================================
 *
 * Se conserva por compatibilidad con componentes
 * o funcionalidades antiguas.
 *
 * La cola activa de sincronización ahora es sync_outbox
 * dentro de SQLite.
 */

const offlineQueueReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.ADD_ENTRY_SUCCESS:
      if (!action.payload?.offlineId) {
        return state;
      }

      return state.filter(
        (item) => item.id !== action.payload.offlineId
      );

    default:
      return state;
  }
};

/*
 * ==========================================
 * CONNECTION
 * ==========================================
 */

const connectionReducer = (
  state = { isOffline: false },
  action
) => {
  switch (action.type) {
    case actionTypes.SET_OFFLINE:
      return {
        ...state,
        isOffline: true,
      };

    case actionTypes.SET_ONLINE:
      return {
        ...state,
        isOffline: false,
      };

    default:
      return state;
  }
};

/*
 * ==========================================
 * SYNCHRONIZATION
 * ==========================================
 */

const syncReducer = (
  state = {
    isSyncing: false,
    lastSync: null,
  },
  action
) => {
  switch (action.type) {
    case actionTypes.SYNC_ENTRIES:
      return {
        ...state,
        isSyncing: true,
      };

    case actionTypes.SYNC_ENTRIES_SUCCESS:
      return {
        ...state,
        isSyncing: false,
        lastSync: new Date().toISOString(),
      };

    case actionTypes.SYNC_ENTRIES_FAILURE:
      return {
        ...state,
        isSyncing: false,
      };

    default:
      return state;
  }
};

/*
 * ==========================================
 * CRISIS ALERTS
 * ==========================================
 */

const crisisReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.CRISIS_DETECTED:
      return [
        ...state,
        {
          ...action.payload,
          timestamp: new Date().toISOString(),
          notified: false,
        },
      ];

    default:
      return state;
  }
};

/*
 * ==========================================
 * ROOT REDUCER
 * ==========================================
 */

export const rootReducer = combineReducers({
  entries: entriesReducer,
  offlineQueue: offlineQueueReducer,
  connection: connectionReducer,
  sync: syncReducer,
  crisisAlerts: crisisReducer,
});
