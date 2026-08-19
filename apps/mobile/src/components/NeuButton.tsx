import React from 'react';
import { 
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, 
  ViewStyle, TextStyle, StyleProp, View 
} from 'react-native';
import { Colors } from '../theme/colors';

interface NeuButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gold' | 'danger';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const NeuButton: React.FC<NeuButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'secondary' ? Colors.primary : Colors.white} 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              variant === 'secondary' ? styles.textSecondary : styles.textLight,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: Colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#C94F43',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  secondary: {
    backgroundColor: Colors.card,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  gold: {
    backgroundColor: Colors.gold,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#B5822B',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  danger: {
    backgroundColor: Colors.rose,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#B83232',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textLight: {
    color: Colors.white,
  },
  textSecondary: {
    color: Colors.text,
  },
});
