import { combineReducers } from '@reduxjs/toolkit';
import { actionTypes } from './actions';

const entriesReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.ADD_ENTRY_SUCCESS:
      return [...state, { ...action.payload, synced: true }];
    case actionTypes.SYNC_ENTRIES_SUCCESS:
      return action.payload;
    default:
      return state;
  }
};

const offlineQueueReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.ADD_ENTRY:
      return [
        ...state,
        {
          id: Date.now().toString(),
          action,
          timestamp: new Date().toISOString(),
          retries: 0,
        },
      ];
    case actionTypes.ADD_ENTRY_SUCCESS:
      return state.filter((item) => item.id !== action.payload.offlineId);
    case actionTypes.SYNC_ENTRIES_SUCCESS:
      return [];
    default:
      return state;
  }
};

const connectionReducer = (state = { isOffline: false }, action) => {
  switch (action.type) {
    case actionTypes.SET_OFFLINE:
      return { ...state, isOffline: true };
    case actionTypes.SET_ONLINE:
      return { ...state, isOffline: false };
    default:
      return state;
  }
};

const syncReducer = (state = { isSyncing: false, lastSync: null }, action) => {
  switch (action.type) {
    case actionTypes.SYNC_ENTRIES:
      return { ...state, isSyncing: true };
    case actionTypes.SYNC_ENTRIES_SUCCESS:
      return { ...state, isSyncing: false, lastSync: new Date() };
    case actionTypes.SYNC_ENTRIES_FAILURE:
      return { ...state, isSyncing: false };
    default:
      return state;
  }
};

const crisisReducer = (state = [], action) => {
  switch (action.type) {
    case actionTypes.CRISIS_DETECTED:
      return [
        ...state,
        { ...action.payload, timestamp: new Date().toISOString(), notified: false },
      ];
    default:
      return state;
  }
};

export const rootReducer = combineReducers({
  entries: entriesReducer,
  offlineQueue: offlineQueueReducer,
  connection: connectionReducer,
  sync: syncReducer,
  crisisAlerts: crisisReducer,
});