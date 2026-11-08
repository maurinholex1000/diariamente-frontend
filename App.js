
import React, { useEffect } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';

import { store } from './src/store';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ConsentProvider, useConsent } from './src/context/ConsentContext';

import { DatabaseService } from './src/services/DatabaseService';
import { syncService } from './src/services/SyncService';
import { notificationService } from './src/services/NotificationService';

// Auth
import { SplashScreen } from './src/screens/shared/SplashScreen';
import { RoleSelectScreen } from './src/screens/auth/RoleSelectScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';

// Patient
import { PatientHomeScreen } from './src/screens/patient/PatientHomeScreen';
import { DiaryEntryScreen } from './src/screens/patient/DiaryEntryScreen';
import { HistoryScreen } from './src/screens/patient/HistoryScreen';
import { EntryDetailScreen } from './src/screens/patient/EntryDetailScreen';
import { ConsentRequestsScreen } from './src/screens/patient/ConsentRequestsScreen';
import { CrisisAlertScreen } from './src/screens/patient/CrisisAlertScreen';

// Therapist
import { TherapistHomeScreen } from './src/screens/therapist/TherapistHomeScreen';
import { PatientListScreen } from './src/screens/therapist/PatientListScreen';
import { LinkPatientScreen } from './src/screens/therapist/LinkPatientScreen';
import { RequestReportScreen } from './src/screens/therapist/RequestReportScreen';
import { ReportsListScreen } from './src/screens/therapist/ReportsListScreen';
import { CrisisAlertDetailScreen } from './src/screens/therapist/CrisisAlertDetailScreen';

// Shared
import { PrivacySettingsScreen } from './src/screens/shared/PrivacySettingsScreen';
import { ConsentScreen } from './src/screens/shared/ConsentScreen';

const Stack = createStackNavigator();

const navigationRef = createNavigationContainerRef();

function AppNavigator() {
  const {
    isLoading,
    isAuthenticated,
    userRole,
    user,
  } = useAuth();

  const {
    hasConsent,
    loading: consentLoading,
  } = useConsent();

  useEffect(() => {
    if (!isAuthenticated || !hasConsent || !user?.uid) {
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        await DatabaseService.initDatabase();

        if (!isMounted) return;

        // Inicializar sincronización para el usuario autenticado.
        syncService.setup(user.uid);

        // Las notificaciones se solicitan únicamente
        // después de aceptar el consentimiento legal.
        const permissionGranted =
          await notificationService.requestPermissions();

        if (!isMounted || !permissionGranted) return;

        await notificationService.getDevicePushToken();

        if (!isMounted) return;

        notificationService.setupListeners(navigationRef);
      } catch (error) {
        console.error('Error inicializando servicios:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
      syncService.stop();
      notificationService.cleanup();
    };
  }, [isAuthenticated, hasConsent, user?.uid]);

  if (isLoading || (isAuthenticated && consentLoading)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 15 }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      ) : !hasConsent ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Consent" component={ConsentScreen} />
        </Stack.Navigator>
      ) : userRole === 'patient' ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#4A90E2' },
            headerTintColor: '#FFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="PatientHome"
            component={PatientHomeScreen}
            options={{ title: 'DIAriaMENTE' }}
          />

          <Stack.Screen
            name="DiaryEntry"
            component={DiaryEntryScreen}
            options={{ title: 'Diario ABC' }}
          />

          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: 'Mis Pensamientos' }}
          />

          <Stack.Screen
            name="EntryDetail"
            component={EntryDetailScreen}
            options={{ title: 'Detalle' }}
          />

          <Stack.Screen
            name="ConsentRequests"
            component={ConsentRequestsScreen}
            options={{ title: 'Solicitudes' }}
          />

          <Stack.Screen
            name="CrisisAlert"
            component={CrisisAlertScreen}
            options={{
              title: '⚠️ Alerta de Seguridad',
              headerStyle: { backgroundColor: '#E53935' },
              headerTintColor: '#FFF',
            }}
          />

          <Stack.Screen
            name="PrivacySettings"
            component={PrivacySettingsScreen}
            options={{ title: 'Privacidad' }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#4A90E2' },
            headerTintColor: '#FFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="TherapistHome"
            component={TherapistHomeScreen}
            options={{ title: 'DIAriaMENTE' }}
          />

          <Stack.Screen
            name="PatientList"
            component={PatientListScreen}
            options={{ title: 'Mis Pacientes' }}
          />

          <Stack.Screen
            name="LinkPatient"
            component={LinkPatientScreen}
            options={{ title: 'Vincular Paciente' }}
          />

          <Stack.Screen
            name="RequestReport"
            component={RequestReportScreen}
            options={{ title: 'Solicitar Reporte' }}
          />

          <Stack.Screen
            name="ReportsList"
            component={ReportsListScreen}
            options={{ title: 'Reportes' }}
          />

          <Stack.Screen
            name="CrisisAlertDetail"
            component={CrisisAlertDetailScreen}
            options={{
              title: '🚨 Detalle de Alerta',
              headerStyle: { backgroundColor: '#E53935' },
              headerTintColor: '#FFF',
            }}
          />

          <Stack.Screen
            name="PrivacySettings"
            component={PrivacySettingsScreen}
            options={{ title: 'Privacidad' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <ConsentProvider>
          <AppNavigator />
        </ConsentProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}
