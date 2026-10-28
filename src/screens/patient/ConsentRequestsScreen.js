import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/ApiService';

export const ConsentRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
    const unsubscribe = navigation.addListener('focus', loadRequests);
    return unsubscribe;
  }, [navigation]);

  const loadRequests = async () => {
    try {
      const data = await ApiService.getConsentRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRespond = (request, accept) => {
    Alert.alert(
      accept ? '✅ Aceptar solicitud' : '❌ Rechazar solicitud',
      accept
        ? `¿Compartir tus pensamientos con ${request.therapist_name}?`
        : `¿Rechazar la solicitud de ${request.therapist_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: accept ? 'Aceptar' : 'Rechazar',
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await ApiService.respondToConsent(request.id, accept);
              Alert.alert('Listo', 'Tu respuesta fue registrada');
              loadRequests();
            } catch (e) {
              Alert.alert('Error', 'No se pudo responder');
            }
          },
        },
      ]
    );
  };

  const renderRequest = ({ item }) => {
    const isPending = item.status === 'pending';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="person" size={22} color="#4A90E2" />
          <Text style={styles.therapistName}>{item.therapist_name}</Text>
        </View>
        <Text style={styles.dateRange}>
          📅 {new Date(item.start_date).toLocaleDateString('es-AR')} →{' '}
          {new Date(item.end_date).toLocaleDateString('es-AR')}
        </Text>

        {isPending ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnAccept]}
              onPress={() => handleRespond(item, true)}
            >
              <MaterialIcons name="check" size={18} color="#FFF" />
              <Text style={styles.btnText}>Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnReject]}
              onPress={() => handleRespond(item, false)}
            >
              <MaterialIcons name="close" size={18} color="#FFF" />
              <Text style={styles.btnText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.badge, item.status === 'accepted' ? styles.badgeOk : styles.badgeNo]}>
            <Text style={styles.badgeText}>
              {item.status === 'accepted' ? '✅ Aceptada' : '❌ Rechazada'}
            </Text>
          </View>
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
      data={requests}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderRequest}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadRequests(); }}
          colors={['#4A90E2']}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="inbox" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>Sin solicitudes</Text>
          <Text style={styles.emptyText}>
            No tenés solicitudes de reporte pendientes
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
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  therapistName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  dateRange: { fontSize: 13, color: '#718096', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', padding: 12, borderRadius: 8, gap: 6,
  },
  btnAccept: { backgroundColor: '#4CAF50' },
  btnReject: { backgroundColor: '#E53935' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  badge: { padding: 8, borderRadius: 8, alignItems: 'center' },
  badgeOk: { backgroundColor: '#E8F5E9' },
  badgeNo: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#718096', marginTop: 8, textAlign: 'center' },
});