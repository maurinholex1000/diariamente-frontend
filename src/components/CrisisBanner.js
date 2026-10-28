import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const CrisisBanner = ({ count, onPress }) => {
  return (
    <TouchableOpacity style={styles.banner} onPress={onPress} activeOpacity={0.9}>
      <MaterialIcons name="warning" size={24} color="#FFF" />
      <View style={styles.content}>
        <Text style={styles.title}>
          {count} alerta{count > 1 ? 's' : ''} de crisis
        </Text>
        <Text style={styles.subtitle}>Requieren atención inmediata</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#FFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E53935',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: { flex: 1 },
  title: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
});