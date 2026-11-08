import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DatabaseService } from '../../services/DatabaseService';
import { useAuth } from '../../context/AuthContext';

export const EntryDetailScreen = ({ route, navigation }) => {
  const { entryId } = route.params || {};
  const { user } = useAuth();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntry = async () => {
      if (!user?.uid || !entryId) {
        setEntry(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await DatabaseService.getEntryById(
          entryId,
          user.uid
        );

        setEntry(data);
      } catch (error) {
        console.error('Error cargando pensamiento:', error);
        setEntry(null);
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [entryId, user?.uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el pensamiento</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>
          {new Date(entry.created_at).toLocaleString('es-AR')}
        </Text>

        {entry.synced === 0 && (
          <View style={styles.pendingBadge}>
            <MaterialIcons
              name="cloud-off"
              size={12}
              color="#FF9800"
            />
            <Text style={styles.pendingText}>
              Pendiente de sincronizar
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          🅰️ Situación activadora
        </Text>

        <Text style={styles.sectionText}>
          {entry.antecedent || 'No especificada'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          🅱️ Pensamiento automático
        </Text>

        <Text style={styles.sectionText}>
          {entry.belief}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          🅲 Emoción y consecuencia
        </Text>

        <Text style={styles.sectionText}>
          Emoción: {entry.user_emotion || 'No especificada'}
        </Text>

        <Text style={[styles.sectionText, { marginTop: 8 }]}>
          {entry.consequence || 'Sin consecuencia registrada'}
        </Text>
      </View>

      {entry.detected_emotion && (
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>
            🤖 Análisis de IA
          </Text>

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>
              Emoción detectada:
            </Text>

            <Text style={styles.aiValue}>
              {entry.detected_emotion}
            </Text>
          </View>

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>
              Distorsión:
            </Text>

            <Text style={styles.aiValue}>
              {entry.detected_distortion}
            </Text>
          </View>

          {entry.confidence_score && (
            <View style={styles.aiRow}>
              <Text style={styles.aiLabel}>
                Confianza:
              </Text>

              <Text style={styles.aiValue}>
                {entry.confidence_score}%
              </Text>
            </View>
          )}
        </View>
      )}

      {entry.flag_riesgo_suicida === 1 && (
        <TouchableOpacity
          style={styles.crisisButton}
          onPress={() =>
            navigation.navigate('CrisisAlert', {
              entryId: entry.id,
              score: entry.risk_score,
            })
          }
        >
          <MaterialIcons name="warning" size={24} color="#FFF" />

          <Text style={styles.crisisText}>
            Ver mensaje de apoyo
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  date: {
    fontSize: 13,
    color: '#718096',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: '#FF9800',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 22,
  },
  aiSection: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  aiRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  aiLabel: {
    width: 140,
    fontSize: 13,
    color: '#718096',
  },
  aiValue: {
    flex: 1,
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '600',
  },
  crisisButton: {
    backgroundColor: '#E53935',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  crisisText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});