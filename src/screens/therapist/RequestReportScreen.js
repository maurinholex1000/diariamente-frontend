import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ApiService } from '../../services/ApiService';

export const RequestReportScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await ApiService.getMyPatients();
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPatients(false);
    }
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setStartDate(start);
    setEndDate(end);
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      Alert.alert('Error', 'Seleccioná un paciente');
      return;
    }
    if (startDate >= endDate) {
      Alert.alert('Error', 'La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    setLoading(true);
    try {
      await ApiService.requestReport({
        patient_id: parseInt(selectedPatientId),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      Alert.alert(
        '✅ Solicitud enviada',
        'El paciente recibirá una notificación para aceptar o rechazar',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo enviar');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPatients) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Paciente</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedPatientId}
          onValueChange={setSelectedPatientId}
        >
          <Picker.Item label="Seleccioná un paciente..." value="" />
          {patients.map((p) => (
            <Picker.Item key={p.id} label={p.name} value={p.id.toString()} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Rango rápido</Text>
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(7)}>
          <Text style={styles.quickBtnText}>Última semana</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(30)}>
          <Text style={styles.quickBtnText}>Último mes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setQuickRange(90)}>
          <Text style={styles.quickBtnText}>3 meses</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Fecha de inicio</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowStartPicker(true)}
      >
        <MaterialIcons name="calendar-today" size={20} color="#4A90E2" />
        <Text style={styles.dateText}>{startDate.toLocaleDateString('es-AR')}</Text>
      </TouchableOpacity>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (d) setStartDate(d);
          }}
        />
      )}

      <Text style={styles.label}>Fecha de fin</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowEndPicker(true)}
      >
        <MaterialIcons name="calendar-today" size={20} color="#4A90E2" />
        <Text style={styles.dateText}>{endDate.toLocaleDateString('es-AR')}</Text>
      </TouchableOpacity>

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (d) setEndDate(d);
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <MaterialIcons name="send" size={20} color="#FFF" />
            <Text style={styles.submitText}>Solicitar reporte</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: {
    fontSize: 14, fontWeight: 'bold', color: '#2D3748',
    marginTop: 16, marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, backgroundColor: '#FFF', padding: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#4A90E2',
    alignItems: 'center',
  },
  quickBtnText: { color: '#4A90E2', fontWeight: '600', fontSize: 12 },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  dateText: { fontSize: 15, color: '#2D3748' },
  submitButton: {
    backgroundColor: '#4A90E2', padding: 16, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 32, marginBottom: 30,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});