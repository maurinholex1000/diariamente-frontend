import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const Button = ({ title, onPress, loading, variant = 'primary', disabled }) => {
  const styles = getStyles(variant);
  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#4A90E2' : '#FFF'} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const getStyles = (variant) => {
  const base = {
    button: {
      height: 52,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    text: { fontSize: 16, fontWeight: 'bold' },
    disabled: { opacity: 0.6 },
  };

  if (variant === 'outline') {
    return {
      ...base,
      button: { ...base.button, borderWidth: 2, borderColor: '#4A90E2', backgroundColor: 'transparent' },
      text: { ...base.text, color: '#4A90E2' },
    };
  }
  if (variant === 'danger') {
    return {
      ...base,
      button: { ...base.button, backgroundColor: '#E53935' },
      text: { ...base.text, color: '#FFF' },
    };
  }
  return {
    ...base,
    button: { ...base.button, backgroundColor: '#4A90E2' },
    text: { ...base.text, color: '#FFF' },
  };
};