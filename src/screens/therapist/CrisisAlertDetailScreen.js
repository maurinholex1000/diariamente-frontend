import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/ApiService';

export const CrisisAlertDetailScreen = ({ route, navigation }) => {
  const { alertId } = route.params || {};
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlertDetail();
  }, [alertId]);

  const loadAlertDetail = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getCrisisAlertDetail(alertId);
      setAlert(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  };

  const handleContactPatient = () => {
    Alert.alert('Contactar paciente', '¿Cómo querés contactarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Llamar', onPress: () => Alert.alert('📞 Llamando...') },
    ]);
  };

  const handleMarkAsAttended = async () => {
    Alert.alert('Marcar como atendida', '¿Confirmás?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.markCrisisAlertAsAttended(alertId);
            Alert.alert('✅ Alerta atendida');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'No se pudo actualizar');
          }
        },
      },
    ]);
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
      <View style={styles.alertHeader}>
        <View style={styles.alertBadge}>
          <MaterialIcons name="warning" size={24} color="#FFF" />
          <Text style={styles.alertBadgeText}>CRISIS ACTIVA</Text>
        </View>
        <Text style={styles.patientName}>{alert?.patient_name}</Text>
        <Text style={styles.alertTime}>{alert?.time_ago || 'Recién'}</Text>
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>SCORE DE RIESGO</Text>
        <Text
          style={[
            styles.scoreNumber,
            (alert?.risk_score || 0) >= 0.95 ? styles.scoreCritical : styles.scoreHigh,
          ]}
        >
          {Math.round((alert?.risk_score || 0) * 100)}%
        </Text>
        <View style={styles.scoreBar}>
          <View
            style={[styles.scoreBarFill, { width: `${(alert?.risk_score || 0) * 100}%` }]}
          />
        </View>
        <Text
          style={[
            styles.scoreLevel,
            (alert?.risk_score || 0) >= 0.95 ? styles.scoreCritical : styles.scoreHigh,
          ]}
        >
          {(alert?.risk_score || 0) >= 0.95 ? '⚠️ RIESGO CRÍTICO' : '⚠️ ALTO RIESGO'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Pensamiento registrado</Text>
        <View style={styles.thoughtContainer}>
          <Text style={styles.thoughtText}>{alert?.belief}</Text>
        </View>
        {alert?.keywords?.map((kw, idx) => (
          <View key={idx} style={styles.keywordBadge}>
            <Text style={styles.keywordText}>🔴 {kw}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Análisis de IA</Text>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Emoción:</Text>
          <Text style={styles.analysisValue}>😢 {alert?.emotion}</Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Distorsión:</Text>
          <Text style={styles.analysisValue}>⚠️ {alert?.distortion}</Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Confianza:</Text>
          <Text style={styles.analysisValue}>{alert?.confidence}%</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.contactButton} onPress={handleContactPatient}>
          <MaterialIcons name="phone" size={24} color="#FFF" />
          <Text style={styles.contactButtonText}>📞 Contactar al paciente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attendButton} onPress={handleMarkAsAttended}>
          <MaterialIcons name="check-circle" size={24} color="#2D3748" />
          <Text style={styles.attendButtonText}>✅ Marcar como atendida</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertHeader: {
    backgroundColor: '#E53935', padding: 20, paddingTop: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 10,
  },
  alertBadgeText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  patientName: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  alertTime: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  scoreContainer: {
    backgroundColor: '#FFF', margin: 16, padding: 20, borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  scoreLabel: { fontSize: 12, color: '#718096', letterSpacing: 2, marginBottom: 8 },
  scoreNumber: { fontSize: 56, fontWeight: 'bold', marginVertical: 8 },
  scoreHigh: { color: '#FF9800' },
  scoreCritical: { color: '#E53935' },
  scoreBar: {
    width: '100%', height: 8, backgroundColor: '#E2E8F0',
    borderRadius: 4, marginVertical: 8,
  },
  scoreBarFill: { height: 8, backgroundColor: '#E53935', borderRadius: 4 },
  scoreLevel: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  section: {
    backgroundColor: '#FFF', margin: 16, marginBottom: 8,
    padding: 16, borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 12,
  },
  thoughtContainer: {
    backgroundColor: '#F8F9FE', padding: 12, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#E53935',
  },
  thoughtText: { fontSize: 16, color: '#2D3748', lineHeight: 24 },
  keywordBadge: {
    backgroundColor: '#FFCDD2', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 16, marginTop: 8, alignSelf: 'flex-start',
  },
  keywordText: { fontSize: 12, color: '#C62828' },
  analysisRow: { flexDirection: 'row', paddingVertical: 4 },
  analysisLabel: { fontSize: 14, color: '#718096', width: 100 },
  analysisValue: { fontSize: 14, color: '#2D3748' },
  actionsContainer: { margin: 16, gap: 12, marginBottom: 30 },
  contactButton: {
    backgroundColor: '#E53935', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, gap: 8,
  },
  contactButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  attendButton: {
    backgroundColor: '#A8E6CF', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, gap: 8,
  },
  attendButtonText: { color: '#2D3748', fontSize: 16, fontWeight: 'bold' },
});