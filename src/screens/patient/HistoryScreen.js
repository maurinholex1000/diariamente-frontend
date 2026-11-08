import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DatabaseService } from '../../services/DatabaseService';
import { useAuth } from '../../context/AuthContext';

export const HistoryScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user?.uid) {
      setEntries([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await DatabaseService.getAllEntries(user.uid);
      setEntries(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadEntries();

    const unsubscribe = navigation.addListener('focus', loadEntries);

    return unsubscribe;
  }, [navigation, loadEntries]);

  const renderEntry = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EntryDetail', {
          entryId: item.id,
        })
      }
    >
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </Text>

      <Text style={styles.belief} numberOfLines={3}>
        {item.belief}
      </Text>

      <View style={styles.tags}>
        {item.detected_emotion && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              😊 {item.detected_emotion}
            </Text>
          </View>
        )}

        {item.detected_distortion &&
          item.detected_distortion !== 'sin_distorsion' && (
            <View style={[styles.tag, styles.tagDistortion]}>
              <Text style={[styles.tagText, { color: '#C62828' }]}>
                ⚠️ {item.detected_distortion}
              </Text>
            </View>
          )}

        {item.flag_riesgo_suicida === 1 && (
          <View style={[styles.tag, styles.tagCrisis]}>
            <Text style={[styles.tagText, { color: '#FFF' }]}>
              🚨 Crisis
            </Text>
          </View>
        )}

        {item.synced === 0 && (
          <View style={[styles.tag, styles.tagPending]}>
            <Text style={[styles.tagText, { color: '#FF9800' }]}>
              ☁️ Pendiente
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      data={entries}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderEntry}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadEntries();
          }}
          colors={['#4A90E2']}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="history" size={64} color="#CBD5E0" />

          <Text style={styles.emptyTitle}>
            Aún no hay pensamientos
          </Text>

          <Text style={styles.emptyText}>
            Empezá registrando tu primer Diario ABC
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  date: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 6,
  },
  belief: {
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagDistortion: {
    backgroundColor: '#FFEBEE',
  },
  tagCrisis: {
    backgroundColor: '#E53935',
  },
  tagPending: {
    backgroundColor: '#FFF3E0',
  },
  tagText: {
    fontSize: 11,
    color: '#2D3748',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
});