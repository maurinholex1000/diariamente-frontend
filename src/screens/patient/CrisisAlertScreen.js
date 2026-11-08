import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DatabaseService } from '../../services/DatabaseService';
import { CRISIS_LINES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export const CrisisAlertScreen = ({ route, navigation }) => {
  const { entryId, score } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const loadCrisisData = async () => {
      setLoading(true);

      try {
        if (entryId && user?.uid) {
          const data = await DatabaseService.getEntryById(
            entryId,
            user.uid
          );

          setEntry(data);
        } else {
          setEntry(null);
        }
      } catch (error) {
        console.error('Error cargando datos de crisis:', error);
        setEntry(null);
      } finally {
        setLoading(false);
      }
    };

    loadCrisisData();
  }, [entryId, user?.uid]);

  const handleCallLine = (number) => {
    Alert.alert('📞 Llamar', `¿Llamar al ${number}?`, [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Llamar',
        onPress: () => Linking.openURL(`tel:${number}`),
      },
    ]);
  };

  const handleContactTherapist = () => {
    Alert.alert(
      '📞 Contactar a tu terapeuta',
      '¿Querés llamar a tu terapeuta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Llamar',
          onPress: () =>
            Alert.alert(
              '📞 Llamando',
              'Llamando a tu terapeuta...'
            ),
        },
      ]
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
    <ScrollView style={styles.container}>
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <MaterialIcons name="warning" size={50} color="#FFF" />
        </View>

        <Text style={styles.alertTitle}>
          ⚠️ Alerta de Seguridad
        </Text>

        <Text style={styles.alertSubtitle}>
          El sistema detectó un pensamiento que podría indicar que estás pasando
          por un momento difícil.
        </Text>
      </View>

      <View style={styles.supportContainer}>
        <MaterialIcons name="favorite" size={32} color="#E53935" />

        <Text style={styles.supportTitle}>
          No estás solo/a
        </Text>

        <Text style={styles.supportText}>
          Lo que estás sintiendo es importante y merece atención. Hay personas
          que se preocupan por vos y están disponibles para ayudarte.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ¿Qué podés hacer ahora?
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={handleContactTherapist}
        >
          <MaterialIcons name="phone" size={28} color="#FFF" />

          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>
              Llamar a tu terapeuta
            </Text>

            <Text style={styles.actionDescription}>
              Contactá a tu terapeuta para recibir apoyo inmediato
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.homeAction]}
          onPress={() => navigation.navigate('PatientHome')}
        >
          <MaterialIcons name="home" size={28} color="#FFF" />

          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>
              Volver al inicio
            </Text>

            <Text style={styles.actionDescription}>
              Seguir usando la aplicación
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📞 Líneas de ayuda
        </Text>

        {CRISIS_LINES.map((line, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.helpLineCard}
            onPress={() => handleCallLine(line.number)}
          >
            <MaterialIcons name="phone" size={20} color="#4A90E2" />

            <View style={styles.helpLineContent}>
              <Text style={styles.helpLineTitle}>
                {line.name}
              </Text>

              <Text style={styles.helpLineNumber}>
                {line.number}
              </Text>

              <Text style={styles.helpLineDescription}>
                {line.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    padding: 20,
  },
  alertHeader: {
    backgroundColor: '#E53935',
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  alertSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  supportContainer: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 12,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#E53935',
  },
  homeAction: {
    backgroundColor: '#4A90E2',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  helpLineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FE',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  helpLineContent: {
    flex: 1,
  },
  helpLineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  helpLineNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  helpLineDescription: {
    fontSize: 12,
    color: '#718096',
  },
});