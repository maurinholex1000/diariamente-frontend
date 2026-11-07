import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

export const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('patient');

  useEffect(() => {
    AsyncStorage.getItem('@Diariamente:role').then((r) => r && setRole(r));
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Completá todos los campos obligatorios');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (role === 'therapist' && !licenseNumber) {
      Alert.alert('Error', 'Los terapeutas deben ingresar su matrícula');
      return;
    }
    setLoading(true);
    const result = await register(
      email.trim(),
      password,
      username.trim(),
      role,
      role === 'therapist' ? licenseNumber.trim() : null
    );
    setLoading(false);
    if (result.success) {
  Alert.alert(
    '¡Cuenta creada!',
    'Te enviamos un correo electrónico para verificar tu cuenta. Revisá tu bandeja de entrada y también la carpeta de spam. Una vez verificada, podrás iniciar sesión.',
    [
      {
        text: 'Entendido',
        onPress: () => navigation.navigate('Login'),
      },
    ]
  );
} else {
  Alert.alert('Error', result.error || 'No se pudo crear la cuenta.');
}
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>
          {role === 'therapist' ? 'Registro de Terapeuta' : 'Registro de Paciente'}
        </Text>

        <View style={styles.inputContainer}>
          <MaterialIcons name="person" size={20} color="#718096" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#A0AEC0"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#718096" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#A0AEC0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {role === 'therapist' && (
          <View style={styles.inputContainer}>
            <MaterialIcons name="badge" size={20} color="#718096" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Número de matrícula"
              placeholderTextColor="#A0AEC0"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={20} color="#718096" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#A0AEC0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock-outline" size={20} color="#718096" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#A0AEC0"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Registrarme</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            ¿Ya tenés cuenta? <Text style={styles.loginTextBold}>Ingresá</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#718096', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, color: '#2D3748', fontSize: 16 },
  button: {
    backgroundColor: '#4A90E2', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginText: { color: '#718096', fontSize: 14 },
  loginTextBold: { color: '#4A90E2', fontWeight: 'bold' },
});