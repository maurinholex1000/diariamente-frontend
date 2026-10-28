import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ApiService } from '../../services/ApiService';

export const ReportsListScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadReports();
    const unsubscribe = navigation.addListener('focus', loadReports);
    return unsubscribe;
  }, [navigation]);

  const loadReports = async () => {
    try {
      const data = await ApiService.getMyRequests();
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

const handleDownload = async (report) => {
  setDownloading(report.id);
  try {
    // 1. Obtener el token de Firebase
    const { auth } = require('../../config/firebase');
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'No estás autenticado');
      return;
    }
    const token = await currentUser.getIdToken();

    // 2. Definir la ruta donde se guardará
    const filename = `reporte_${report.patient_name}_${report.id}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // 3. Descargar directamente al filesystem (sin blob, sin base64)
    const downloadResult = await FileSystem.downloadAsync(
      `${process.env.EXPO_PUBLIC_API_URL}/therapist/download-report/${report.id}`,
      fileUri,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('📥 Descarga status:', downloadResult.status);
    console.log('📁 Archivo guardado en:', downloadResult.uri);

    if (downloadResult.status !== 200) {
      Alert.alert('Error', `El servidor devolvió ${downloadResult.status}`);
      return;
    }

    // 4. Compartir / abrir el PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir reporte',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('✅ Descargado', `Guardado en:\n${downloadResult.uri}`);
    }
  } catch (error) {
    console.error('❌ Error descargando PDF:', error);
    Alert.alert('Error', `No se pudo descargar: ${error.message}`);
  } finally {
    setDownloading(null);
  }
};

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: '#FFF3E0', color: '#FF9800', text: 'Pendiente', icon: 'schedule' },
      accepted: { bg: '#E8F5E9', color: '#4CAF50', text: 'Aceptado', icon: 'check-circle' },
      rejected: { bg: '#FFEBEE', color: '#E53935', text: 'Rechazado', icon: 'cancel' },
    };
    return config[status] || config.pending;
  };

  const renderReport = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const isDownloading = downloading === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <MaterialIcons name="person" size={20} color="#4A90E2" />
            <Text style={styles.patientName}>{item.patient_name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <MaterialIcons name={badge.icon} size={14} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.text}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <MaterialIcons name="date-range" size={14} color="#718096" />
          <Text style={styles.dateText}>
            {new Date(item.start_date).toLocaleDateString('es-AR')} →{' '}
            {new Date(item.end_date).toLocaleDateString('es-AR')}
          </Text>
        </View>

        {item.status === 'accepted' && item.pdf_path && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => handleDownload(item)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialIcons name="download" size={18} color="#FFF" />
                <Text style={styles.downloadText}>Descargar PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {item.status === 'pending' && (
          <Text style={styles.pendingText}>
            ⏳ Esperando consentimiento del paciente
          </Text>
        )}
      </View>
    );
  };

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
      data={reports}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderReport}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadReports(); }}
          colors={['#4A90E2']}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="folder-open" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No hay reportes aún</Text>
          <Text style={styles.emptyText}>
            Solicitá un reporte desde el panel principal
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  listContent: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  patientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dateText: { fontSize: 13, color: '#718096' },
  downloadButton: {
    backgroundColor: '#4A90E2', borderRadius: 8, padding: 12,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 12,
  },
  downloadText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  pendingText: {
    fontSize: 13, color: '#FF9800', marginTop: 8,
    fontStyle: 'italic', textAlign: 'center',
  },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#718096', marginTop: 8, textAlign: 'center' },
});