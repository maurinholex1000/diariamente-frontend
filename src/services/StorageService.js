import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@Diariamente:token',
  ROLE: '@Diariamente:role',
  OFFLINE_QUEUE: '@Diariamente:offlineQueue',
  FCM_TOKEN: '@Diariamente:fcmToken',
};

export const StorageService = {
  async saveToken(token) { await AsyncStorage.setItem(KEYS.TOKEN, token); },
  async getToken() { return await AsyncStorage.getItem(KEYS.TOKEN); },

  async saveRole(role) { await AsyncStorage.setItem(KEYS.ROLE, role); },
  async getRole() { return await AsyncStorage.getItem(KEYS.ROLE); },

  async saveFcmToken(token) { await AsyncStorage.setItem(KEYS.FCM_TOKEN, token); },
  async getFcmToken() { return await AsyncStorage.getItem(KEYS.FCM_TOKEN); },

  async getOfflineQueue() {
    const data = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  },
  async saveOfflineQueue(queue) {
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },
  async addToOfflineQueue(item) {
    const queue = await this.getOfflineQueue();
    queue.push(item);
    await this.saveOfflineQueue(queue);
  },
  async removeFromOfflineQueue(id) {
    const queue = await this.getOfflineQueue();
    await this.saveOfflineQueue(queue.filter((item) => item.id !== id));
  },
  async updateOfflineQueueItem(updatedItem) {
    const queue = await this.getOfflineQueue();
    const index = queue.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      queue[index] = updatedItem;
      await this.saveOfflineQueue(queue);
    }
  },

  async clearAll() {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },
};