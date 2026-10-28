import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { useAuth } from './AuthContext';

const ConsentContext = createContext();
const CONSENT_KEY = '@Diariamente:legalConsent';

export const ConsentProvider = ({ children }) => {
  const { isAuthenticated, backendUser } = useAuth();
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasConsent(false);
      setLoading(false);
      return;
    }
    checkConsent();
  }, [isAuthenticated, backendUser]);

  const checkConsent = async () => {
    setLoading(true);
    try {
      const local = await AsyncStorage.getItem(CONSENT_KEY);
      if (local === 'accepted') {
        setHasConsent(true);
        setLoading(false);
        return;
      }
      try {
        const result = await ApiService.getLegalConsent();
        if (result?.accepted) {
          await AsyncStorage.setItem(CONSENT_KEY, 'accepted');
          setHasConsent(true);
        } else {
          setHasConsent(false);
        }
      } catch (e) {
        setHasConsent(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const acceptConsent = async () => {
    try {
      await ApiService.acceptLegalConsent({
        version: '1.0.0',
        accepted_at: new Date().toISOString(),
      });
      await AsyncStorage.setItem(CONSENT_KEY, 'accepted');
      setHasConsent(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = { hasConsent, loading, acceptConsent, checkConsent };
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent debe usarse dentro de ConsentProvider');
  return ctx;
};