
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { ApiService } from './ApiService';
import { StorageService } from './StorageService';

const PUSH_ENABLED = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationRef = null;
  }

  async requestPermissions() {
    if (!PUSH_ENABLED) return false;

    try {
      if (!Device.isDevice) {
        console.warn(
          'Las notificaciones push requieren un dispositivo físico'
        );
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(
          'diariamente-crisis',
          {
            name: 'Alertas de Crisis',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#E53935',
          }
        );
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } =
          await Notifications.requestPermissionsAsync();

        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('El usuario no concedió permisos de notificaciones');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  async getDevicePushToken() {
    if (!PUSH_ENABLED) return null;

    try {
      if (Platform.OS !== 'android') {
        console.warn(
          'La obtención de token FCM está configurada para Android'
        );
        return null;
      }

      // Obtener token nativo de Firebase Cloud Messaging.
      const tokenResponse =
        await Notifications.getDevicePushTokenAsync();

      const deviceToken = tokenResponse.data;

      if (!deviceToken) {
        throw new Error('Firebase no devolvió un token de dispositivo');
      }

      // Registrar el token en nuestro backend.
      // await ApiService.registerFcmToken(deviceToken);
      try {
  await ApiService.registerFcmToken(deviceToken);
  console.log('✅ Token FCM registrado en el backend');
} catch (error) {
  console.error('❌ Error registrando token FCM:', {
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url,
  });
  throw error;
}

      // Guardar el token localmente.
      await StorageService.saveFcmToken(deviceToken);

      console.log('Token FCM registrado correctamente');

      return deviceToken;
    } catch (error) {
      console.error('Error obteniendo o registrando token FCM:', error);
      return null;
    }
  }

  setupListeners(navigationRef) {
    if (!PUSH_ENABLED) return;

    this.navigationRef = navigationRef;

    this.notificationListener =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notificación recibida:', notification);
      });

    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response.notification.request.content.data || {};

          if (!this.navigationRef?.current) return;

          switch (data.type) {
            case 'crisis_alert':
              this.navigationRef.current.navigate('CrisisAlertDetail', {
                alertId: data.entry_id,
              });
              break;

            case 'self_crisis_alert':
              this.navigationRef.current.navigate('CrisisAlert', {
                entryId: data.entry_id,
              });
              break;

            case 'consent_request':
              this.navigationRef.current.navigate('ConsentRequests');
              break;

            case 'report_ready':
              this.navigationRef.current.navigate('ReportsList');
              break;

            default:
              console.log('Tipo de notificación sin navegación:', data.type);
              break;
          }
        }
      );
  }

  async sendLocalNotification(title, body, data = {}) {
    if (!PUSH_ENABLED) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'diariamente-crisis',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error enviando notificación local:', error);
    }
  }

  cleanup() {
  if (this.notificationListener) {
    this.notificationListener.remove();
    this.notificationListener = null;
  }

  if (this.responseListener) {
    this.responseListener.remove();
    this.responseListener = null;
  }

  this.navigationRef = null;
}
}

export const notificationService = new NotificationService();
