
import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const expectedOwnerUid = config.expectedOwnerUid;

  // Evitamos enviar una propiedad personalizada a Axios.
  delete config.expectedOwnerUid;

  const currentUser = auth.currentUser;

  if (expectedOwnerUid) {
    if (!currentUser) {
      throw new Error(
        'No hay una sesión autenticada para realizar esta operación.'
      );
    }

    if (currentUser.uid !== expectedOwnerUid) {
      throw new Error(
        'La sesión actual no corresponde al propietario de los datos.'
      );
    }
  }

  if (currentUser) {
    const token = await currentUser.getIdToken();

    // Comprobamos que la sesión no haya cambiado mientras obteníamos
    // el token.
    if (auth.currentUser?.uid !== currentUser.uid) {
      throw new Error(
        'La sesión cambió durante la preparación de la petición.'
      );
    }

    if (
      expectedOwnerUid &&
      currentUser.uid !== expectedOwnerUid
    ) {
      throw new Error(
        'El usuario autenticado no coincide con el propietario esperado.'
      );
    }

    config.headers = config.headers || {};
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

function buildDiaryParams(limit, offset) {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 200
  ) {
    throw new Error(
      'El límite de pensamientos debe estar entre 1 y 200.'
    );
  }

  if (
    !Number.isInteger(parsedOffset) ||
    parsedOffset < 0
  ) {
    throw new Error(
      'El desplazamiento de la paginación no es válido.'
    );
  }

  return {
    limit: parsedLimit,
    offset: parsedOffset,
  };
}

export const ApiService = {
  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  async registerUserInBackend(userData, tokenOverride = null) {
    const headers = tokenOverride
      ? { Authorization: `Bearer ${tokenOverride}` }
      : {};

    const response = await api.post(
      '/auth/register',
      userData,
      { headers }
    );

    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');

    return response.data;
  },

  // ==========================================
  // DIARIO
  // ==========================================

  async saveDiaryEntry(entry, expectedOwnerUid = null) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(
        'Los datos del pensamiento no son válidos.'
      );
    }

    const config = expectedOwnerUid
      ? { expectedOwnerUid }
      : {};

    const response = await api.post(
      '/diary/entries',
      entry,
      config
    );

    return response.data;
  },

  async getDiaryEntries(
    limit = 100,
    offset = 0,
    expectedOwnerUid = null
  ) {
    /*
     * Compatibilidad con la llamada anterior:
     *
     * getDiaryEntries(100, ownerUid)
     *
     * La nueva firma permite:
     *
     * getDiaryEntries(200, 0, ownerUid)
     */
    if (typeof offset === 'string') {
      expectedOwnerUid = offset;
      offset = 0;
    }

    const params = buildDiaryParams(limit, offset);

    const config = {
      params,
      ...(expectedOwnerUid
        ? { expectedOwnerUid }
        : {}),
    };

    const response = await api.get(
      '/diary/entries',
      config
    );

    return response.data;
  },

  // ==========================================
  // INTELIGENCIA ARTIFICIAL
  // ==========================================

  async analyzeText(text) {
    const response = await api.post(
      '/ai/analyze',
      { text }
    );

    return response.data;
  },

  // ==========================================
  // CONSENTIMIENTO
  // ==========================================

  async getConsentRequests() {
    const response = await api.get(
      '/consent/requests'
    );

    return response.data;
  },

  async respondToConsent(requestId, accept) {
    const response = await api.post(
      `/consent/respond/${requestId}`,
      { accept }
    );

    return response.data;
  },

  // ==========================================
  // TERAPEUTA
  // ==========================================

  async getMyPatients() {
    const response = await api.get(
      '/therapist/patients'
    );

    return response.data;
  },

  async linkPatient(email) {
    const response = await api.post(
      `/therapist/link-patient/${email}`
    );

    return response.data;
  },

  async requestReport(data) {
    const response = await api.post(
      '/consent/request',
      data
    );

    return response.data;
  },

  async getMyRequests() {
    const response = await api.get(
      '/therapist/requests'
    );

    return response.data;
  },

  async downloadReport(consentId) {
    const response = await api.get(
      `/therapist/download-report/${consentId}`,
      {
        responseType: 'blob',
      }
    );

    return response.data;
  },

  // ==========================================
  // ALERTAS DE CRISIS
  // ==========================================

  async getCrisisAlerts() {
    const response = await api.get(
      '/therapist/crisis-alerts'
    );

    return response.data;
  },

  async getCrisisAlertDetail(entryId) {
    const response = await api.get(
      `/therapist/crisis-alert/${entryId}`
    );

    return response.data;
  },

  async markCrisisAlertAsAttended(entryId) {
    const response = await api.post(
      `/therapist/crisis-alert/${entryId}/mark-attended`
    );

    return response.data;
  },

  // ==========================================
  // NOTIFICACIONES
  // ==========================================

  async registerFcmToken(token) {
    const response = await api.post(
      '/notifications/register-token',
      { token }
    );

    return response.data;
  },

  // ==========================================
  // ASPECTOS LEGALES
  // ==========================================

  async getLegalConsent() {
    const response = await api.get(
      '/legal/consent'
    );

    return response.data;
  },

  async acceptLegalConsent(data) {
    const response = await api.post(
      '/legal/consent',
      data
    );

    return response.data;
  },
};
