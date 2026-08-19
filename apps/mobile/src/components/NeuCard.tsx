import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface NeuCardProps extends ViewProps {
  elevated?: boolean;
  children: React.ReactNode;
}

export const NeuCard: React.FC<NeuCardProps> = ({ elevated = false, style, children, ...props }) => {
  return (
    <View
      style={[
        styles.card,
        elevated ? styles.elevated : styles.standard,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  standard: {
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 6,
  },
});
