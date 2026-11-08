import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import { useAuth } from '../context/AuthContext';

export const useCrisis = () => {
  const { user } = useAuth();

  const [pendingCrisis, setPendingCrisis] = useState(null);

  const checkPendingCrisis = useCallback(async () => {
    if (!user?.uid) {
      setPendingCrisis(null);
      return;
    }

    try {
      const entries = await DatabaseService.getAllEntries(user.uid);

      const crisis = entries.find(
        (entry) =>
          entry.flag_riesgo_suicida &&
          !entry.crisis_notified
      );

      setPendingCrisis(crisis || null);
    } catch (error) {
      console.error('Error verificando crisis pendientes:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    checkPendingCrisis();
  }, [checkPendingCrisis]);

  return {
    pendingCrisis,
    checkPendingCrisis,
  };
};