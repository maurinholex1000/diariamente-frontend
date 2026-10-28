import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useConsent } from '../../context/ConsentContext';
import { useAuth } from '../../context/AuthContext';

export const ConsentScreen = () => {
  const { acceptConsent } = useConsent();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    if (!checked) {
      Alert.alert('Atención', 'Debés aceptar los términos para continuar');
      return;
    }
    setLoading(true);
    const result = await acceptConsent();
    setLoading(false);
    if (!result.success) Alert.alert('Error', result.error);
  };

  const handleReject = () => {
    Alert.alert(
      'Rechazar términos',
      'Sin aceptar los términos no podés usar DIAriaMENTE. ¿Querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="gavel" size={48} color="#4A90E2" />
        <Text style={styles.title}>Consentimiento Informado</Text>
        <Text style={styles.subtitle}>Ley 25.326 de Protección de Datos Personales</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Datos que recopilamos</Text>
        <Text style={styles.body}>
          DIAriaMENTE recopila: tu email, nombre, rol, y los pensamientos que
          registres voluntariamente en el Diario ABC. Tus datos identificatorios
          están separados del contenido emocional.
        </Text>

        <Text style={styles.sectionTitle}>2. Cómo protegemos tus datos</Text>
        <Text style={styles.body}>
          • Encriptación AES-256 en reposo (Cloud KMS){'\n'}
          • Encriptación TLS en tránsito{'\n'}
          • Autenticación delegada a Firebase (Google){'\n'}
          • Separación estricta identidad ↔ contenido
        </Text>

        <Text style={styles.sectionTitle}>3. Quién puede ver tus datos</Text>
        <Text style={styles.body}>
          Solo vos y, con tu consentimiento explícito, tu terapeuta. Nunca
          compartimos tus datos con terceros sin tu autorización.
        </Text>

        <Text style={styles.sectionTitle}>4. Tus derechos</Text>
        <Text style={styles.body}>
          Podés acceder, rectificar, actualizar o eliminar tus datos en cualquier
          momento desde la sección "Privacidad".
        </Text>

        <Text style={styles.sectionTitle}>5. Datos sensibles</Text>
        <Text style={styles.body}>
          Tus pensamientos son datos sensibles según el Art. 2 de la Ley 25.326.
          Los tratamos con confidencialidad absoluta.
        </Text>
      </View>

      <TouchableOpacity style={styles.checkRow} onPress={() => setChecked(!checked)}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <MaterialIcons name="check" size={16} color="#FFF" />}
        </View>
        <Text style={styles.checkText}>
          He leído y acepto los términos de consentimiento informado
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.acceptButton, loading && styles.disabled]}
        onPress={handleAccept}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.acceptText}>Aceptar y continuar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
        <Text style={styles.rejectText}>Rechazar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { padding: 24, alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#718096', marginTop: 4 },
  section: { backgroundColor: '#FFF', margin: 16, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2D3748', marginTop: 16, marginBottom: 6 },
  body: { fontSize: 14, color: '#4A5568', lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 4, borderWidth: 2,
    borderColor: '#4A90E2', justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#4A90E2' },
  checkText: { flex: 1, fontSize: 14, color: '#2D3748' },
  acceptButton: {
    backgroundColor: '#4A90E2', marginHorizontal: 16, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  acceptText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  rejectButton: { alignItems: 'center', padding: 16, marginBottom: 30 },
  rejectText: { color: '#718096', fontSize: 14 },
});