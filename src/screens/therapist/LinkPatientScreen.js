import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/ApiService';

export const LinkPatientScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!email) {
      Alert.alert('Error', 'Ingresá el email del paciente');
      return;
    }
    setLoading(true);
    try {
      const result = await ApiService.linkPatient(email.trim());
      Alert.alert('✅ Vinculado', result.message || 'Paciente vinculado');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo vincular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="person-add" size={60} color="#4A90E2" />
      </View>
      <Text style={styles.title}>Vincular Paciente</Text>
      <Text style={styles.subtitle}>
        Ingresá el email del paciente para vincularlo
      </Text>

      <View style={styles.inputContainer}>
        <MaterialIcons name="email" size={20} color="#718096" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="paciente@ejemplo.com"
          placeholderTextColor="#A0AEC0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={handleLink}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Vincular</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE', padding: 24 },
  iconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E3F2FD', alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 40, marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: '#718096', textAlign: 'center',
    marginTop: 8, marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 16, borderWidth: 1,
    borderColor: '#E2E8F0', marginBottom: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, color: '#2D3748', fontSize: 16 },
  button: {
    backgroundColor: '#4A90E2', borderRadius: 12,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});