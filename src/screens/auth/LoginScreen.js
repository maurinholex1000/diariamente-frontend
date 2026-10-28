import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

// ⚠️ TEMPORAL: Google Sign-In desactivado hasta configurar Development Build
// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
// import { GOOGLE_CONFIG } from '../../config/googleAuth';

// ⚠️ CAMBIAR A true CUANDO TENGAS DEVELOPMENT BUILD
const GOOGLE_SIGNIN_ENABLED = false;

// WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }) => {
  const { login, resetPassword /*, loginWithGoogle */ } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [role, setRole] = useState(null);

  // ⚠️ Google Auth Hook (desactivado)
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   webClientId: GOOGLE_CONFIG.webClientId,
  //   iosClientId: GOOGLE_CONFIG.iosClientId,
  //   androidClientId: GOOGLE_CONFIG.androidClientId,
  // });

  useEffect(() => {
    AsyncStorage.getItem('@Diariamente:role').then(setRole);
  }, []);

  // ⚠️ Efecto de respuesta de Google (desactivado)
  // useEffect(() => {
  //   if (response?.type === 'success') {
  //     handleGoogleSuccess(response);
  //   } else if (response?.type === 'error') {
  //     Alert.alert('Error', 'No se pudo iniciar con Google');
  //     setGoogleLoading(false);
  //   }
  // }, [response]);

  // ⚠️ handleGoogleSuccess (desactivado)
  // const handleGoogleSuccess = async (resp) => {
  //   const { id_token } = resp.params || {};
  //   if (!id_token) {
  //     Alert.alert('Error', 'No se obtuvo el token de Google');
  //     setGoogleLoading(false);
  //     return;
  //   }
  //   const result = await loginWithGoogle(id_token, role);
  //   setGoogleLoading(false);
  //   if (!result.success) Alert.alert('Error', result.error);
  // };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) Alert.alert('Error', result.error);
  };

  const handleGoogleLogin = async () => {
    if (!GOOGLE_SIGNIN_ENABLED) {
      Alert.alert(
        'Función no disponible',
        'El inicio de sesión con Google estará disponible próximamente.'
      );
      return;
    }
    // ⚠️ Código original (se activa cuando GOOGLE_SIGNIN_ENABLED=true)
    // setGoogleLoading(true);
    // try {
    //   await promptAsync();
    // } catch (e) {
    //   setGoogleLoading(false);
    //   Alert.alert('Error', 'No se pudo abrir Google');
    // }
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Recuperar contraseña',
      'Ingresá tu email',
      async (inputEmail) => {
        if (!inputEmail) return;
        const result = await resetPassword(inputEmail.trim());
        if (result.success) {
          Alert.alert('✅ Enviado', 'Revisá tu correo');
        } else {
          Alert.alert('Error', result.error);
        }
      },
      'plain-text',
      email
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Bienvenido/a</Text>
          <Text style={styles.subtitle}>
            {role === 'therapist' ? 'Panel Terapeuta' : 'Tu espacio seguro'}
          </Text>
        </View>

        <View style={styles.form}>
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

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <MaterialIcons name="login" size={22} color="#4285F4" />
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              ¿No tenés cuenta? <Text style={styles.registerTextBold}>Registrate</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Cambiar rol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2D3748' },
  subtitle: { fontSize: 16, color: '#718096', marginTop: 8 },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, color: '#2D3748', fontSize: 16 },
  forgotText: { color: '#4A90E2', textAlign: 'right', marginBottom: 24 },
  button: {
    backgroundColor: '#4A90E2', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 12, color: '#A0AEC0', fontSize: 13 },
  googleButton: {
    backgroundColor: '#FFF', borderRadius: 12, height: 52,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  googleButtonText: { color: '#2D3748', fontSize: 15, fontWeight: '600' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerText: { color: '#718096', fontSize: 14 },
  registerTextBold: { color: '#4A90E2', fontWeight: 'bold' },
  backLink: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#718096', fontSize: 14 },
});