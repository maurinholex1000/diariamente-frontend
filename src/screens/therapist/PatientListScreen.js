import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/ApiService';

export const PatientListScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([
        ApiService.getMyPatients().catch(() => []),
        ApiService.getCrisisAlerts().catch(() => []),
      ]);
      setPatients(p);
      setCrisisAlerts(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAttendCrisis = (entryId) => {
    Alert.alert(
      'Marcar como atendida',
      '¿Confirmás que ya atendiste esta alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.markCrisisAlertAsAttended(entryId);
              Alert.alert('✅ Alerta atendida');
              loadData();
            } catch (e) {
              Alert.alert('Error', 'No se pudo actualizar');
            }
          },
        },
      ]
    );
  };

  const renderCrisisAlert = (alert) => (
    <View key={`crisis-${alert.id}`} style={[styles.card, styles.crisisCard]}>
      <View style={styles.row}>
        <MaterialIcons name="warning" size={24} color="#E53935" />
        <Text style={styles.crisisName}>{alert.patient_name}</Text>
      </View>
      <Text style={styles.crisisText} numberOfLines={2}>{alert.belief}</Text>
      <Text style={styles.crisisScore}>
        Score: {Math.round((alert.risk_score || 0) * 100)}%
      </Text>
      <View style={styles.crisisActions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() =>
            navigation.navigate('CrisisAlertDetail', { alertId: alert.id })
          }
        >
          <MaterialIcons name="visibility" size={16} color="#FFF" />
          <Text style={styles.btnText}>Ver detalle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnOk]}
          onPress={() => handleAttendCrisis(alert.id)}
        >
          <MaterialIcons name="check" size={16} color="#FFF" />
          <Text style={styles.btnText}>Atendida</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPatient = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialIcons name="person" size={22} color="#4A90E2" />
        <Text style={styles.patientName}>{item.name}</Text>
      </View>
      <Text style={styles.patientEmail}>{item.email}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={patients}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderPatient}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          colors={['#4A90E2']}
        />
      }
      ListHeaderComponent={
        crisisAlerts.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>🚨 Alertas activas</Text>
            {crisisAlerts.map(renderCrisisAlert)}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              👥 Mis pacientes
            </Text>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>👥 Mis pacientes</Text>
        )
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="people-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No tenés pacientes aún</Text>
          <Text style={styles.emptyText}>
            Vinculá uno desde el panel principal
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  listContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#2D3748', marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  crisisCard: { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: '#FFEBEE' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  crisisName: { fontSize: 16, fontWeight: 'bold', color: '#C62828' },
  crisisText: { fontSize: 14, color: '#2D3748', lineHeight: 20, marginBottom: 8 },
  crisisScore: { fontSize: 13, color: '#E53935', fontWeight: 'bold', marginBottom: 12 },
  crisisActions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', padding: 10, borderRadius: 8, gap: 6,
  },
  btnDanger: { backgroundColor: '#E53935' },
  btnOk: { backgroundColor: '#4CAF50' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  patientEmail: { fontSize: 13, color: '#718096' },
  empty: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#718096', marginTop: 8, textAlign: 'center' },
});