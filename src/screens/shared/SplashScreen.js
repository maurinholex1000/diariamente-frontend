import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('RoleSelect'), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>DIAriaMENTE</Text>
      <Text style={styles.subtitle}>Tu diario emocional</Text>
      <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#FFF', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  loader: { marginTop: 40 },
});