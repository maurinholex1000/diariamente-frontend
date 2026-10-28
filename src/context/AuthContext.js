import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';

const AuthContext = createContext();

function mapFirebaseError(code) {
  const errors = {
    'auth/email-already-in-use': 'El email ya está registrado',
    'auth/invalid-email': 'Email inválido',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde',
    'auth/network-request-failed': 'Error de conexión',
    'auth/popup-closed-by-user': 'Cancelaste el inicio de sesión',
  };
  return errors[code] || 'Error desconocido';
}

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    setIsLoading(true);
    if (firebaseUser) {
      const role = await AsyncStorage.getItem('@Diariamente:role');
      setUser(firebaseUser);
      setUserRole(role);
      setIsAuthenticated(true);

      try {
        const backendData = await ApiService.getCurrentUser();
        setBackendUser(backendData);
        console.log('✅ Usuario en backend:', backendData.email);
      } catch (e) {
        if (
          e.response?.status === 404 &&
          e.response?.data?.detail === 'Usuario no encontrado'
        ) {
          console.log('🔄 Usuario no existe en backend. Registrando...');
          try {
            const token = await firebaseUser.getIdToken();
            await ApiService.registerUserInBackend(
              {
                email: firebaseUser.email,
                username:
                  firebaseUser.displayName ||
                  firebaseUser.email.split('@')[0],
                role: role || 'patient',
                license_number: null,
                firebase_uid: firebaseUser.uid,
              },
              token
            );
            console.log('✅ Usuario registrado en backend');
            const backendData = await ApiService.getCurrentUser();
            setBackendUser(backendData);
            console.log('✅ Usuario obtenido:', backendData.email);
          } catch (regError) {
            console.log('❌ Error al registrar:', regError.message);
            console.log('   Detalle:', regError.response?.data);
          }
        } else {
          console.log('Usuario aún no en backend:', e.message);
        }
      }
    } else {
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      setBackendUser(null);
    }
    setIsLoading(false);
  });
  return unsubscribe;
}, []);

  const register = async (email, password, username, role, licenseNumber = null) => {
  try {
    // PASO 1: Crear en Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    await AsyncStorage.setItem('@Diariamente:role', role);

    // PASO 2: Crear en PostgreSQL
    try {
      const token = await firebaseUser.getIdToken();
      await ApiService.registerUserInBackend(
        {
          email,
          username,
          role,
          license_number: licenseNumber,
          firebase_uid: firebaseUser.uid,
        },
        token
      );
    } catch (backendError) {
      // El usuario ya está en Firebase, pero falló en el backend
      console.log('⚠️ Usuario creado en Firebase pero falló en backend:', backendError.message);
      // Igual seguimos, porque el useAuth lo va a auto-registrar
    }

    setUser(firebaseUser);
    setUserRole(role);
    setIsAuthenticated(true);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapFirebaseError(error.code) };
  }
};

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = await AsyncStorage.getItem('@Diariamente:role');
      setUser(userCredential.user);
      setUserRole(role);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  const loginWithGoogle = async (idToken, role) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      if (role) {
        await AsyncStorage.setItem('@Diariamente:role', role);
        setUserRole(role);
      }

      const token = await firebaseUser.getIdToken();
      try {
        await ApiService.getCurrentUser();
      } catch (e) {
        const finalRole =
          role || (await AsyncStorage.getItem('@Diariamente:role')) || 'patient';
        await ApiService.registerUserInBackend(
          {
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            role: finalRole,
            license_number: null,
            firebase_uid: firebaseUser.uid,
          },
          token
        );
      }

      setUser(firebaseUser);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      setBackendUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  const value = {
    isLoading,
    isAuthenticated,
    user,
    userRole,
    backendUser,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};