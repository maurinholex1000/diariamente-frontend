
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../../context/AuthContext';
import { GOOGLE_CONFIG, redirectUri } from '../../config/googleAuth';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }) => {
  const { login, resetPassword, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Autenticación mediante Google OAuth
  const [request, response, promptAsync] =
  Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CONFIG.webClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    redirectUri,
  });

  // Recuperar el rol seleccionado anteriormente
  useEffect(() => {
    const loadRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('@Diariamente:role');
        setRole(savedRole);
      } catch (error) {
        console.error('Error recuperando el rol:', error);
      } finally {
        setRoleLoaded(true);
      }
    };

    loadRole();
  }, []);

  // Procesar la respuesta de Google
  useEffect(() => {
  console.log('GOOGLE RESPONSE TYPE:', response?.type);
  console.log('GOOGLE RESPONSE ERROR:', response?.error);
  console.log('GOOGLE REDIRECT URI:', redirectUri);

    if (!response) return;

    const handleGoogleResponse = async () => {
      if (response.type === 'success') {
        const idToken = response.params?.id_token;

        if (!idToken) {
          Alert.alert(
            'Error',
            'No se obtuvo el token de Google. Intentá nuevamente.'
          );
          setGoogleLoading(false);
          return;
        }

        try {
          console.log('GOOGLE ID TOKEN RECEIVED:', !!idToken);
          console.log('FIREBASE LOGIN START');
          const result = await loginWithGoogle(idToken, role);
          console.log('FIREBASE LOGIN RESULT:', result);

          if (!result.success) {
            Alert.alert('Error', result.error || 'No se pudo iniciar sesión.');
          }
        } catch (error) {
          console.error('Error durante el login con Google:', error);
          Alert.alert('Error', 'No se pudo completar el inicio de sesión.');
        } finally {
          setGoogleLoading(false);
        }
      } else if (response.type === 'error') {
        console.error('Google OAuth error:', response.error);

        setGoogleLoading(false);
        Alert.alert(
          'Error',
          'No se pudo iniciar sesión con Google. Intentá nuevamente.'
        );
      } else if (
        response.type === 'cancel' ||
        response.type === 'dismiss'
      ) {
        setGoogleLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response, role]);

  // Login tradicional con email y contraseña
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error durante el login:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleLogin = async () => {
    if (!request) {
      Alert.alert(
        'Un momento',
        'Google todavía se está inicializando. Intentá nuevamente.'
      );
      return;
    }

    if (!roleLoaded) {
      Alert.alert(
        'Un momento',
        'Estamos recuperando tu tipo de usuario.'
      );
      return;
    }

    setGoogleLoading(true);

    try {
      await promptAsync();
    } catch (error) {
      console.error('Error abriendo Google OAuth:', error);

      setGoogleLoading(false);
      Alert.alert('Error', 'No se pudo abrir Google.');
    }
  };

  // Recuperación de contraseña
  const handleForgotPassword = () => {
    Alert.prompt(
      'Recuperar contraseña',
      'Ingresá tu email',
      async (inputEmail) => {
        if (!inputEmail?.trim()) return;

        try {
          const result = await resetPassword(inputEmail.trim());

          if (result.success) {
            Alert.alert('Enviado', 'Revisá tu correo.');
          } else {
            Alert.alert('Error', result.error);
          }
        } catch (error) {
          console.error('Error recuperando contraseña:', error);
          Alert.alert('Error', 'No se pudo enviar el correo.');
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
            {role === 'therapist'
              ? 'Panel Terapeuta'
              : 'Tu espacio seguro'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="email"
              size={20}
              color="#718096"
              style={styles.inputIcon}
            />

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

          {/* Contraseña */}
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="lock"
              size={20}
              color="#718096"
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Recuperar contraseña */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {/* Login tradicional */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || googleLoading) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login con Google */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              (googleLoading || !request) && styles.buttonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={
              loading ||
              googleLoading ||
              !request ||
              !roleLoaded
            }
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <MaterialIcons
                  name="login"
                  size={22}
                  color="#4285F4"
                />

                <Text style={styles.googleButtonText}>
                  Continuar con Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Registro */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              ¿No tenés cuenta?{' '}
              <Text style={styles.registerTextBold}>
                Registrate
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Cambiar rol */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              ← Cambiar rol
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  header: {
    marginBottom: 40,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3748',
  },

  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 8,
  },

  form: {
    width: '100%',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    height: 52,
    color: '#2D3748',
    fontSize: 16,
  },

  forgotText: {
    color: '#4A90E2',
    textAlign: 'right',
    marginBottom: 24,
  },

  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  dividerText: {
    marginHorizontal: 12,
    color: '#A0AEC0',
    fontSize: 13,
  },

  googleButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  googleButtonText: {
    color: '#2D3748',
    fontSize: 15,
    fontWeight: '600',
  },

  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },

  registerText: {
    color: '#718096',
    fontSize: 14,
  },

  registerTextBold: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },

  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },

  backText: {
    color: '#718096',
    fontSize: 14,
  },
});
