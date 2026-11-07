import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';

const AuthContext = createContext();

const ROLE_KEY = '@Diariamente:role';
const PENDING_PROFILE_KEY = '@Diariamente:pendingProfile';

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

  return errors[code] || 'No se pudo completar la autenticación';
}

function getRequestError(error) {
  return (
    error.response?.data?.detail ||
    mapFirebaseError(error.code)
  );
}

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);

  // Evita que el listener y loginWithGoogle registren simultáneamente.
  const syncPromiseRef = useRef(null);

  const syncBackendUser = async (firebaseUser) => {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const syncPromise = (async () => {
      await firebaseUser.reload();

      const providerIds = firebaseUser.providerData.map(
        (provider) => provider.providerId
      );

      const isPasswordUser = providerIds.includes('password');

      // No sincronizar usuarios que todavía no verificaron su email.
      if (isPasswordUser && !firebaseUser.emailVerified) {
        setUser(null);
        setBackendUser(null);
        setIsAuthenticated(false);

        return {
          success: false,
          requiresVerification: true,
        };
      }

      // Actualizar el token para obtener los claims más recientes.
      await firebaseUser.getIdToken(true);

      let backendData;

      try {
        backendData = await ApiService.getCurrentUser();
      } catch (error) {
        const userNotFound =
          error.response?.status === 404 &&
          error.response?.data?.detail === 'Usuario no encontrado';

        if (!userNotFound) {
          throw error;
        }

        console.log('🔄 Usuario no existe en backend. Registrando...');

        const pendingData = await AsyncStorage.getItem(
          PENDING_PROFILE_KEY
        );

        const storedRole = await AsyncStorage.getItem(ROLE_KEY);

        const pendingProfile = pendingData
          ? JSON.parse(pendingData)
          : {};

        const payload = {
          username:
            pendingProfile.username ||
            firebaseUser.displayName ||
            firebaseUser.email.split('@')[0],

          role:
            pendingProfile.role ||
            storedRole ||
            'patient',

          license_number:
            pendingProfile.license_number || null,
        };

        try {
          await ApiService.registerUserInBackend(payload);
        } catch (registerError) {
          // Si otro proceso ya lo registró, recuperamos su perfil.
          if (registerError.response?.status !== 409) {
            throw registerError;
          }

          console.log(
            'ℹ️ El usuario ya estaba registrado. Recuperando perfil...'
          );
        }

        backendData = await ApiService.getCurrentUser();

        console.log('✅ Usuario registrado/recuperado:', backendData.email);
      }

      // El perfil del backend es la fuente de verdad del rol.
      await AsyncStorage.setItem(ROLE_KEY, backendData.role);

      await AsyncStorage.removeItem(PENDING_PROFILE_KEY);

      setUser(firebaseUser);
      setBackendUser(backendData);
      setUserRole(backendData.role);
      setIsAuthenticated(true);

      return {
        success: true,
        backendUser: backendData,
      };
    })();

    syncPromiseRef.current = syncPromise;

    try {
      return await syncPromise;
    } finally {
      syncPromiseRef.current = null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);

      if (!firebaseUser) {
        setUser(null);
        setUserRole(null);
        setIsAuthenticated(false);
        setBackendUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const result = await syncBackendUser(firebaseUser);

        if (result.requiresVerification) {
          console.log('📧 El usuario todavía debe verificar su correo');
        }
      } catch (error) {
        console.error(
          '❌ Error sincronizando usuario:',
          error.response?.data || error.message
        );

        setUser(null);
        setBackendUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Registro con email y contraseña.
  const register = async (
    email,
    password,
    username,
    role,
    licenseNumber = null
  ) => {
    let firebaseCreated = false;

    try {
      const normalizedRole = role || 'patient';

      if (!['patient', 'therapist'].includes(normalizedRole)) {
        return {
          success: false,
          error: 'El tipo de cuenta seleccionado no es válido',
        };
      }

      const pendingProfile = {
  username: username.trim(),
  role: normalizedRole,
  license_number:
    normalizedRole === 'therapist' && licenseNumber?.trim()
      ? licenseNumber.trim()
      : null,
};
      // Guardar los datos antes de crear la cuenta.
      // El listener de Firebase puede ejecutarse inmediatamente.
      await AsyncStorage.setItem(ROLE_KEY, normalizedRole);

      await AsyncStorage.setItem(
        PENDING_PROFILE_KEY,
        JSON.stringify(pendingProfile)
      );

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      firebaseCreated = true;

      await sendEmailVerification(userCredential.user);

      // Cerrar la sesión automática de Firebase.
      await signOut(auth);

      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      setBackendUser(null);

      console.log('📧 Correo de verificación enviado:', email);

      return {
        success: true,
        requiresVerification: true,
        message: 'Te enviamos un correo para verificar tu cuenta.',
      };
    } catch (error) {
      console.error(
        '❌ Error durante el registro:',
        error.code,
        error.message
      );

      if (!firebaseCreated) {
        await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
        await AsyncStorage.removeItem(ROLE_KEY);
      } else if (auth.currentUser) {
        await signOut(auth);
      }

      return {
        success: false,
        error: mapFirebaseError(error.code),
      };
    }
  };

  // Inicio de sesión con email y contraseña.
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await userCredential.user.reload();

      if (!userCredential.user.emailVerified) {
        await signOut(auth);

        return {
          success: false,
          error: 'Debés verificar tu correo antes de iniciar sesión.',
        };
      }

      const result = await syncBackendUser(userCredential.user);

      if (!result.success) {
        return {
          success: false,
          error: 'No se pudo completar la autenticación.',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en login:', error.response?.data || error.message);

      return {
        success: false,
        error: getRequestError(error),
      };
    }
  };

  // Inicio de sesión / registro con Google.
  // licenseNumber debe enviarse cuando el rol seleccionado sea therapist.
  const loginWithGoogle = async (
    idToken,
    role,
    licenseNumber = null,
    username = null
  ) => {
    try {
      const storedRole = await AsyncStorage.getItem(ROLE_KEY);
      const finalRole = role || storedRole || 'patient';

      if (!['patient', 'therapist'].includes(finalRole)) {
        return {
          success: false,
          error: 'El tipo de cuenta seleccionado no es válido',
        };
      }

      // Guardar antes de autenticar con Firebase.
      await AsyncStorage.setItem(ROLE_KEY, finalRole);

      const pendingProfile = {
  username: username?.trim() || '',
  role: finalRole,
  license_number: null,
};

      await AsyncStorage.setItem(
        PENDING_PROFILE_KEY,
        JSON.stringify(pendingProfile)
      );

      const credential = GoogleAuthProvider.credential(idToken);

      const userCredential = await signInWithCredential(
        auth,
        credential
      );

      const firebaseUser = userCredential.user;

      await firebaseUser.reload();

      const result = await syncBackendUser(firebaseUser);

      if (!result.success) {
        return {
          success: false,
          error: result.requiresVerification
            ? 'Debés verificar tu correo antes de continuar.'
            : 'No se pudo completar el inicio de sesión.',
        };
      }

      console.log('✅ Google autenticado y perfil sincronizado');

      return { success: true };
    } catch (error) {
      console.error(
        '❌ Error en loginWithGoogle:',
        error.response?.data || error.message
      );

      return {
        success: false,
        error: getRequestError(error),
      };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);

      await AsyncStorage.removeItem(ROLE_KEY);
      await AsyncStorage.removeItem(PENDING_PROFILE_KEY);

      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      setBackendUser(null);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error.code),
      };
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};