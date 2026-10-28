import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/ApiService';
import { CrisisBanner } from '../../components/CrisisBanner';

export const TherapistHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, pendingRequests: 0, crisisAlerts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const unsubscribe = navigation.addListener('focus', loadStats);
    return unsubscribe;
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [patients, requests, crisis] = await Promise.all([
        ApiService.getMyPatients().catch(() => []),
        ApiService.getMyRequests().catch(() => []),
        ApiService.getCrisisAlerts().catch(() => []),
      ]);
      setStats({
        patients: patients.length,
        pendingRequests: requests.filter((r) => r.status === 'pending').length,
        crisisAlerts: crisis.length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {stats.crisisAlerts > 0 && (
        <CrisisBanner
          count={stats.crisisAlerts}
          onPress={() => navigation.navigate('PatientList')}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.greeting}>Panel del Terapeuta</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="people" size={24} color="#4A90E2" />
          <Text style={styles.statNumber}>{stats.patients}</Text>
          <Text style={styles.statLabel}>Pacientes</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="inbox" size={24} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, stats.crisisAlerts > 0 && styles.statCardDanger]}>
          <MaterialIcons
            name="warning"
            size={24}
            color={stats.crisisAlerts > 0 ? '#E53935' : '#4A90E2'}
          />
          <Text
            style={[
              styles.statNumber,
              stats.crisisAlerts > 0 && { color: '#E53935' },
            ]}
          >
            {stats.crisisAlerts}
          </Text>
          <Text style={styles.statLabel}>Alertas</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('PatientList')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
            <MaterialIcons name="people" size={28} color="#4A90E2" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mis Pacientes</Text>
            <Text style={styles.actionDescription}>Ver lista y alertas</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('LinkPatient')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
            <MaterialIcons name="person-add" size={28} color="#4CAF50" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Vincular Paciente</Text>
            <Text style={styles.actionDescription}>Agregar por email</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('RequestReport')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
            <MaterialIcons name="description" size={28} color="#9C27B0" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Solicitar Reporte</Text>
            <Text style={styles.actionDescription}>Pedir acceso a un paciente</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ReportsList')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
            <MaterialIcons name="folder" size={28} color="#4CAF50" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mis Reportes</Text>
            <Text style={styles.actionDescription}>Descargar PDFs generados</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
            <MaterialIcons name="settings" size={28} color="#FF9800" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Configuración</Text>
            <Text style={styles.actionDescription}>Privacidad y cuenta</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#A0AEC0" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#2D3748' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  statCardDanger: { borderColor: '#E53935', backgroundColor: '#FFEBEE' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#718096', marginTop: 2 },
  actionsContainer: { padding: 16, gap: 12 },
  actionCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  actionDescription: { fontSize: 13, color: '#718096', marginTop: 2 },
});