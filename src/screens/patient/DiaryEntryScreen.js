
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useDispatch } from 'react-redux';

import { addEntry } from '../../store/actions';
import { ApiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

const EMOTIONS = [
  'Alegría',
  'Tristeza',
  'Enojo',
  'Miedo',
  'Ansiedad',
  'Frustración',
  'Culpa',
  'Vergüenza',
];

export const DiaryEntryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [antecedent, setAntecedent] = useState('');
  const [belief, setBelief] = useState('');
  const [consequence, setConsequence] = useState('');
  const [userEmotion, setUserEmotion] = useState('');

  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Analizar pensamiento automático mediante IA.
  const handleAnalyze = async () => {
    if (!belief || belief.trim().length < 3) {
      Alert.alert(
        'Atención',
        'Escribí tu pensamiento antes de analizar'
      );
      return;
    }

    setAnalyzing(true);

    try {
      const result = await ApiService.analyzeText(belief.trim());
      setAiResult(result);
    } catch (error) {
      console.error('Error analizando pensamiento:', error);

      Alert.alert(
        'Error',
        'No se pudo analizar el texto'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Guardar pensamiento asociado al usuario autenticado.
  const handleSave = async () => {
    if (!belief || belief.trim().length < 3) {
      Alert.alert(
        'Error',
        'El pensamiento automático es obligatorio'
      );
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        'Error',
        'No se pudo identificar al usuario autenticado. Volvé a iniciar sesión.'
      );
      return;
    }

    setLoading(true);

    try {
      const entry = {
        id: Date.now().toString(),

        // UID de Firebase: identifica al propietario del pensamiento.
        owner_uid: user.uid,

        antecedent: antecedent.trim(),
        belief: belief.trim(),
        consequence: consequence.trim(),
        user_emotion: userEmotion,

        detected_emotion: aiResult?.emotion ?? null,
        detected_distortion: aiResult?.distortion ?? null,
        confidence_score: aiResult?.emotion_confidence ?? null,
        risk_score: aiResult?.risk_score ?? null,
        flag_riesgo_suicida: aiResult?.flag_riesgo_suicida ?? false,
      };

      // El middleware se encarga de SQLite y de la sincronización.
      await dispatch(addEntry(entry));

      Alert.alert(
        '✅ Guardado',
        'Tu pensamiento se registró correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error guardando pensamiento:', error);

      Alert.alert(
        'Error',
        'No se pudo guardar el pensamiento. Intentá nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* A - Situación activadora */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.stepBadge}>A</Text>
          <Text style={styles.sectionTitle}>
            Situación activadora
          </Text>
        </View>

        <Text style={styles.sectionHint}>
          ¿Qué pasó? Describí el evento que disparó tu pensamiento
        </Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Mi jefe me miró raro en la reunión..."
          placeholderTextColor="#A0AEC0"
          value={antecedent}
          onChangeText={setAntecedent}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* B - Pensamiento automático */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.stepBadge}>B</Text>
          <Text style={styles.sectionTitle}>
            Pensamiento automático
          </Text>
        </View>

        <Text style={styles.sectionHint}>
          ¿Qué pensaste en ese momento?
        </Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Seguro piensa que soy un inútil..."
          placeholderTextColor="#A0AEC0"
          value={belief}
          onChangeText={setBelief}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[
            styles.aiButton,
            analyzing && styles.disabled,
          ]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#9C27B0" />
          ) : (
            <>
              <MaterialIcons
                name="auto-awesome"
                size={20}
                color="#9C27B0"
              />
              <Text style={styles.aiButtonText}>
                Analizar con IA
              </Text>
            </>
          )}
        </TouchableOpacity>

        {aiResult && (
          <View style={styles.aiResult}>
            <Text style={styles.aiResultTitle}>
              🤖 Análisis de IA
            </Text>

            <Text style={styles.aiResultText}>
              <Text style={styles.bold}>Emoción:</Text>{' '}
              {aiResult.emotion} ({aiResult.emotion_confidence}%)
            </Text>

            <Text style={styles.aiResultText}>
              <Text style={styles.bold}>Distorsión:</Text>{' '}
              {aiResult.distortion}
            </Text>

            <View style={styles.socraticBox}>
              <MaterialIcons
                name="lightbulb-outline"
                size={20}
                color="#FF9800"
              />

              <Text style={styles.socraticText}>
                {aiResult.socratic_question}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* C - Emoción y consecuencia */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.stepBadge}>C</Text>
          <Text style={styles.sectionTitle}>
            Emoción y consecuencia
          </Text>
        </View>

        <Text style={styles.sectionHint}>
          ¿Qué emoción sentiste? ¿Cómo reaccionaste?
        </Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={userEmotion}
            onValueChange={setUserEmotion}
            style={styles.picker}
          >
            <Picker.Item
              label="Seleccioná una emoción..."
              value=""
            />

            {EMOTIONS.map((emotion) => (
              <Picker.Item
                key={emotion}
                label={emotion}
                value={emotion}
              />
            ))}
          </Picker>
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="¿Qué hiciste después? Ej: Me quedé callado, evité hablar..."
          placeholderTextColor="#A0AEC0"
          value={consequence}
          onChangeText={setConsequence}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Guardar pensamiento */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          loading && styles.disabled,
        ]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <MaterialIcons
              name="save"
              size={20}
              color="#FFF"
            />

            <Text style={styles.saveButtonText}>
              Guardar pensamiento
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },

  section: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },

  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },

  sectionHint: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 12,
    fontStyle: 'italic',
  },

  input: {
    backgroundColor: '#F8F9FE',
    borderRadius: 8,
    padding: 12,
    color: '#2D3748',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9C27B0',
    backgroundColor: '#F3E5F5',
  },

  aiButtonText: {
    color: '#9C27B0',
    fontWeight: 'bold',
    fontSize: 14,
  },

  disabled: {
    opacity: 0.6,
  },

  aiResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3E5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },

  aiResultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },

  aiResultText: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 4,
  },

  bold: {
    fontWeight: 'bold',
  },

  socraticBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },

  socraticText: {
    flex: 1,
    fontSize: 13,
    color: '#2D3748',
    fontStyle: 'italic',
  },

  pickerContainer: {
    backgroundColor: '#F8F9FE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  picker: {
    height: 50,
    color: '#2D3748',
  },

  saveButton: {
    backgroundColor: '#4A90E2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
