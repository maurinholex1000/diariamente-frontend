import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export const PrivacySettingsScreen = () => {
  const { logout, user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [shareData, setShareData] = useState(false);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro/a?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const handleExportData = () => {
    Alert.alert('📥 Exportar datos', 'Recibirás un archivo con tus pensamientos.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={40} color="#FFF" />
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Privacidad</Text>
        <Text style={styles.sectionDescription}>
          Tus datos están protegidos con encriptación AES-256 y Cloud KMS de Google.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Configuración</Text>

        <View style={styles.settingRow}>
          <MaterialIcons name="notifications" size={22} color="#4A90E2" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notificaciones push</Text>
            <Text style={styles.settingDescription}>Recibir alertas y recordatorios</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#E2E8F0', true: '#4A90E2' }}
          />
        </View>

        <View style={styles.settingRow}>
          <MaterialIcons name="share" size={22} color="#4A90E2" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Compartir datos anónimos</Text>
            <Text style={styles.settingDescription}>Ayudar a mejorar la app</Text>
          </View>
          <Switch
            value={shareData}
            onValueChange={setShareData}
            trackColor={{ false: '#E2E8F0', true: '#4A90E2' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Tus datos</Text>

        <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
          <MaterialIcons name="download" size={22} color="#4A90E2" />
          <Text style={styles.actionText}>Exportar mis datos</Text>
          <MaterialIcons name="chevron-right" size={22} color="#A0AEC0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            Alert.alert('🗑️ Eliminar cuenta', 'Esta acción es irreversible.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive' },
            ])
          }
        >
          <MaterialIcons name="delete-forever" size={22} color="#E53935" />
          <Text style={[styles.actionText, { color: '#E53935' }]}>
            Eliminar mi cuenta
          </Text>
          <MaterialIcons name="chevron-right" size={22} color="#A0AEC0" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={22} color="#FFF" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>DIAriaMENTE v3.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { backgroundColor: '#4A90E2', padding: 24, alignItems: 'center', paddingTop: 40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  email: { color: '#FFF', fontSize: 16, marginTop: 12 },
  section: { backgroundColor: '#FFF', margin: 16, marginBottom: 0, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#718096', lineHeight: 20 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F8', gap: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
  settingDescription: { fontSize: 12, color: '#718096', marginTop: 2 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F8', gap: 12,
  },
  actionText: { flex: 1, fontSize: 15, color: '#2D3748' },
  logoutButton: {
    backgroundColor: '#E53935', margin: 16, marginTop: 24, padding: 16,
    borderRadius: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', color: '#A0AEC0', fontSize: 12, marginBottom: 30 },
});