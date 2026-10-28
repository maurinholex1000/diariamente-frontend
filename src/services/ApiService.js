import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken(true);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Token expirado o inválido');
    }
    return Promise.reject(error);
  }
);

export const ApiService = {
  // Auth
  async registerUserInBackend(userData, tokenOverride = null) {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {};
    return (await api.post('/auth/register', userData, { headers })).data;
  },
  async getCurrentUser() {
    return (await api.get('/auth/me')).data;
  },

  // Diario
  async saveDiaryEntry(entry) {
    return (await api.post('/diary/entries', entry)).data;
  },
  async getDiaryEntries(limit = 100) {
    return (await api.get(`/diary/entries?limit=${limit}`)).data;
  },

  // IA
  async analyzeText(text) {
    return (await api.post('/ai/analyze', { text })).data;
  },

  // Consentimiento
  async getConsentRequests() {
    return (await api.get('/consent/requests')).data;
  },
  async respondToConsent(requestId, accept) {
    return (await api.post(`/consent/respond/${requestId}`, { accept })).data;
  },

  // Terapeuta
  async getMyPatients() {
    return (await api.get('/therapist/patients')).data;
  },
  async linkPatient(email) {
    return (await api.post(`/therapist/link-patient/${email}`)).data;
  },
  async requestReport(data) {
    return (await api.post('/consent/request', data)).data;
  },
  async getMyRequests() {
    return (await api.get('/therapist/requests')).data;
  },
  async downloadReport(consentId) {
    return (await api.get(`/therapist/download-report/${consentId}`, {
      responseType: 'blob',
    })).data;
  },

  // Crisis
  async getCrisisAlerts() {
    return (await api.get('/therapist/crisis-alerts')).data;
  },
  async getCrisisAlertDetail(entryId) {
    return (await api.get(`/therapist/crisis-alert/${entryId}`)).data;
  },
  async markCrisisAlertAsAttended(entryId) {
    return (await api.post(`/therapist/crisis-alert/${entryId}/mark-attended`)).data;
  },

  // Notificaciones
  async registerFcmToken(token) {
    return (await api.post('/notifications/register-token', { token })).data;
  },

  // Legal
  async getLegalConsent() {
    return (await api.get('/legal/consent')).data;
  },
  async acceptLegalConsent(data) {
    return (await api.post('/legal/consent', data)).data;
  },
};