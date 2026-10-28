import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RoleSelectScreen = ({ navigation }) => {
  const handleSelect = async (role) => {
    await AsyncStorage.setItem('@Diariamente:role', role);
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cómo querés usar DIAriaMENTE?</Text>
      <Text style={styles.subtitle}>Elegí tu rol para continuar</Text>

      <TouchableOpacity
        style={[styles.card, styles.patientCard]}
        onPress={() => handleSelect('patient')}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons name="person" size={40} color="#4A90E2" />
        </View>
        <Text style={styles.cardTitle}>Soy Paciente</Text>
        <Text style={styles.cardDescription}>
          Quiero registrar mis pensamientos y emociones
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.therapistCard]}
        onPress={() => handleSelect('therapist')}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons name="medical-services" size={40} color="#9C27B0" />
        </View>
        <Text style={styles.cardTitle}>Soy Terapeuta</Text>
        <Text style={styles.cardDescription}>
          Quiero acompañar a mis pacientes en su proceso
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE', padding: 20, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#718096', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  patientCard: { borderColor: '#4A90E2' },
  therapistCard: { borderColor: '#9C27B0' },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0F4FF', justifyContent: 'center',
    alignItems: 'center', marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: '#718096', textAlign: 'center' },
});