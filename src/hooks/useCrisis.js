import { useState, useEffect } from 'react';
import { DatabaseService } from '../services/DatabaseService';

export const useCrisis = () => {
  const [pendingCrisis, setPendingCrisis] = useState(null);

  useEffect(() => {
    checkPendingCrisis();
  }, []);

  const checkPendingCrisis = async () => {
    try {
      const entries = await DatabaseService.getAllEntries();
      const crisis = entries.find(
        (e) => e.flag_riesgo_suicida && !e.crisis_notified
      );
      setPendingCrisis(crisis || null);
    } catch (e) {
      console.error(e);
    }
  };

  return { pendingCrisis, checkPendingCrisis };
};