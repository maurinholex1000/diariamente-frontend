export const actionTypes = {
  ADD_ENTRY: 'ADD_ENTRY',
  ADD_ENTRY_SUCCESS: 'ADD_ENTRY_SUCCESS',
  ADD_ENTRY_FAILURE: 'ADD_ENTRY_FAILURE',
  SYNC_ENTRIES: 'SYNC_ENTRIES',
  SYNC_ENTRIES_SUCCESS: 'SYNC_ENTRIES_SUCCESS',
  SYNC_ENTRIES_FAILURE: 'SYNC_ENTRIES_FAILURE',
  SET_OFFLINE: 'SET_OFFLINE',
  SET_ONLINE: 'SET_ONLINE',
  CRISIS_DETECTED: 'CRISIS_DETECTED',
};

export const addEntry = (entry) => ({
  type: actionTypes.ADD_ENTRY,
  payload: entry,
  meta: { offline: true },
});

export const addEntrySuccess = (entry) => ({
  type: actionTypes.ADD_ENTRY_SUCCESS,
  payload: entry,
});

export const addEntryFailure = (error) => ({
  type: actionTypes.ADD_ENTRY_FAILURE,
  payload: error,
});

export const syncEntries = () => ({ type: actionTypes.SYNC_ENTRIES });
export const syncEntriesSuccess = (entries) => ({
  type: actionTypes.SYNC_ENTRIES_SUCCESS, payload: entries,
});
export const syncEntriesFailure = (error) => ({
  type: actionTypes.SYNC_ENTRIES_FAILURE, payload: error,
});
export const setOffline = () => ({ type: actionTypes.SET_OFFLINE });
export const setOnline = () => ({ type: actionTypes.SET_ONLINE });
export const crisisDetected = (entry, score) => ({
  type: actionTypes.CRISIS_DETECTED, payload: { entry, score },
});