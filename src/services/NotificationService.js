// ⚠️ TEMPORAL: Notificaciones push desactivadas hasta configurar Development Build.
// Para reactivar: cambiar PUSH_ENABLED a true y descomentar los imports nativos.

// import * as Notifications from 'expo-notifications';   // ⚠️ DESACTIVADO
// import * as Device from 'expo-device';                 // ⚠️ DESACTIVADO
// import Constants from 'expo-constants';                // ⚠️ DESACTIVADO
// import { Platform } from 'react-native';               // ⚠️ DESACTIVADO

import { ApiService } from './ApiService';
import { StorageService } from './StorageService';

// ⚠️ CAMBIAR A true CUANDO TENGAS DEVELOPMENT BUILD
const PUSH_ENABLED = false;

// ⚠️ Configuración del handler (desactivada)
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//     priority: Notifications.AndroidNotificationPriority.MAX,
//   }),
// });

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationRef = null;
  }

  async requestPermissions() {
    if (!PUSH_ENABLED) {
      console.log('⚠️ [NotificationService] Push desactivado (PUSH_ENABLED=false)');
      return false;
    }
    // ⚠️ Código original (se activa cuando PUSH_ENABLED=true)
    // if (!Device.isDevice) {
    //   console.warn('Las notificaciones push requieren dispositivo físico');
    //   return false;
    // }
    // const { status: existing } = await Notifications.getPermissionsAsync();
    // let final = existing;
    // if (existing !== 'granted') {
    //   const { status } = await Notifications.requestPermissionsAsync();
    //   final = status;
    // }
    // if (final !== 'granted') return false;
    // if (Platform.OS === 'android') {
    //   await Notifications.setNotificationChannelAsync('diariamente-crisis', {
    //     name: 'Alertas de Crisis',
    //     importance: Notifications.AndroidImportance.MAX,
    //     vibrationPattern: [0, 250, 250, 250],
    //     lightColor: '#E53935',
    //   });
    // }
    // return true;
  }

  async getExpoPushToken() {
    if (!PUSH_ENABLED) {
      console.log('⚠️ [NotificationService] getExpoPushToken desactivado');
      return null;
    }
    // ⚠️ Código original (se activa cuando PUSH_ENABLED=true)
    // try {
    //   const projectId =
    //     Constants.expoConfig?.extra?.eas?.projectId ||
    //     Constants.easConfig?.projectId;
    //   const token = await Notifications.getExpoPushTokenAsync({ projectId });
    //   await StorageService.saveFcmToken(token.data);
    //   await ApiService.registerFcmToken(token.data);
    //   return token.data;
    // } catch (error) {
    //   console.error('Error obteniendo token:', error);
    //   return null;
    // }
  }

  setupListeners(navigationRef) {
    this.navigationRef = navigationRef;
    if (!PUSH_ENABLED) {
      console.log('⚠️ [NotificationService] setupListeners desactivado');
      return;
    }
    // ⚠️ Código original (se activa cuando PUSH_ENABLED=true)
    // this.notificationListener = Notifications.addNotificationReceivedListener(
    //   (notification) => {
    //     console.log('📩 Notificación recibida:', notification);
    //   }
    // );
    // this.responseListener =
    //   Notifications.addNotificationResponseReceivedListener((response) => {
    //     const data = response.notification.request.content.data || {};
    //     if (!this.navigationRef?.current) return;
    //     switch (data.type) {
    //       case 'crisis_alert':
    //         this.navigationRef.current.navigate('CrisisAlertDetail', {
    //           alertId: data.entry_id,
    //         });
    //         break;
    //       case 'self_crisis_alert':
    //         this.navigationRef.current.navigate('CrisisAlert', {
    //           entryId: data.entry_id,
    //         });
    //         break;
    //       case 'consent_request':
    //         this.navigationRef.current.navigate('ConsentRequests');
    //         break;
    //       case 'report_ready':
    //         this.navigationRef.current.navigate('ReportsList');
    //         break;
    //       default:
    //         break;
    //     }
    //   });
  }

  async sendLocalNotification(title, body, data = {}) {
    if (!PUSH_ENABLED) {
      console.log('⚠️ [NotificationService] sendLocalNotification desactivado:', title);
      return;
    }
    // ⚠️ Código original (se activa cuando PUSH_ENABLED=true)
    // await Notifications.scheduleNotificationAsync({
    //   content: {
    //     title, body, data, sound: true,
    //     priority: Notifications.AndroidNotificationPriority.MAX,
    //   },
    //   trigger: null,
    // });
  }

  cleanup() {
    if (!PUSH_ENABLED) {
      console.log('⚠️ [NotificationService] cleanup desactivado');
      return;
    }
    // ⚠️ Código original (se activa cuando PUSH_ENABLED=true)
    // if (this.notificationListener) {
    //   Notifications.removeNotificationSubscription(this.notificationListener);
    // }
    // if (this.responseListener) {
    //   Notifications.removeNotificationSubscription(this.responseListener);
    // }
  }
}

export const notificationService = new NotificationService();