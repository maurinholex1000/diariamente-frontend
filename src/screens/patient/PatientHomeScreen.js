import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { DatabaseService } from '../../services/DatabaseService';
import { CrisisBanner } from '../../components/CrisisBanner';

export const PatientHomeScreen = ({ navigation }) => {
  const { user, backendUser } = useAuth();
  const [recentEntries, setRecentEntries] = useState([]);
  const [pendingCrisis, setPendingCrisis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0 });

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const entries = await DatabaseService.getAllEntries();
      console.log('📊 Entradas locales cargadas:', entries.length);
      setRecentEntries(entries.slice(0, 3));

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const thisWeek = entries.filter(
        (e) => new Date(e.created_at).getTime() > oneWeekAgo
      ).length;

      setStats({ total: entries.length, thisWeek });

      const crisis = entries.find(
        (e) => e.flag_riesgo_suicida && !e.crisis_notified
      );
      if (crisis) setPendingCrisis(crisis);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getName = () => {
    return (
      backendUser?.username ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      ''
    );
  };

  const formatDate = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const name = getName();

  return (
    <ScrollView style={styles.container}>
      {pendingCrisis && (
        <CrisisBanner
          count={1}
          onPress={() =>
            navigation.navigate('CrisisAlert', {
              entryId: pendingCrisis.id,
              score: pendingCrisis.risk_score,
            })
          }
        />
      )}

      <View style={styles.header}>
        <Text style={styles.greeting}>
          {getGreeting()}{name ? `, ${name}` : ''}
        </Text>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Pensamientos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>Esta semana</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.mainAction}
        onPress={() => navigation.navigate('DiaryEntry')}
      >
        <View style={styles.mainActionIcon}>
          <MaterialIcons name="edit" size={32} color="#FFF" />
        </View>
        <View style={styles.mainActionContent}>
          <Text style={styles.mainActionTitle}>Registrar pensamiento</Text>
          <Text style={styles.mainActionDescription}>
            Usá el Diario ABC para identificar tus emociones
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('History')}
        >
          <MaterialIcons name="history" size={28} color="#4A90E2" />
          <Text style={styles.quickActionText}>Historial</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('ConsentRequests')}
        >
          <MaterialIcons name="inbox" size={28} color="#4A90E2" />
          <Text style={styles.quickActionText}>Solicitudes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          <MaterialIcons name="privacy-tip" size={28} color="#4A90E2" />
          <Text style={styles.quickActionText}>Privacidad</Text>
        </TouchableOpacity>
      </View>

      {recentEntries.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Pensamientos recientes</Text>
          {recentEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              onPress={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
            >
              <Text style={styles.entryText} numberOfLines={2}>
                {entry.belief}
              </Text>
              <View style={styles.entryFooter}>
                <Text style={styles.entryDate}>
                  {new Date(entry.created_at).toLocaleDateString('es-AR')}
                </Text>
                {entry.synced === 0 && (
                  <View style={styles.pendingBadge}>
                    <MaterialIcons name="cloud-off" size={12} color="#FF9800" />
                    <Text style={styles.pendingText}>Pendiente</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#2D3748' },
  date: { fontSize: 14, color: '#718096', marginTop: 4 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 12, color: '#718096', marginTop: 4 },
  mainAction: {
    backgroundColor: '#4A90E2', margin: 16, borderRadius: 16,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  mainActionIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  mainActionContent: { flex: 1 },
  mainActionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  mainActionDescription: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  quickAction: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  quickActionText: { fontSize: 12, color: '#2D3748', marginTop: 8 },
  recentSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 12 },
  entryCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  entryText: { fontSize: 14, color: '#2D3748', lineHeight: 20 },
  entryFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  },
  entryDate: { fontSize: 12, color: '#A0AEC0' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingText: { fontSize: 11, color: '#FF9800' },
});