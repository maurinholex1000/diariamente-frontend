import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './reducers';
import { offlineMiddleware } from './middleware/offlineMiddleware';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['offline/queue'],
        ignoredPaths: ['offlineQueue'],
      },
    }).concat(offlineMiddleware),
});

export default store;