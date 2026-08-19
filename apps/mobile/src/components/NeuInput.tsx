import React from 'react';
import { 
  View, TextInput, Text, StyleSheet, TextInputProps, 
  StyleProp, ViewStyle 
} from 'react-native';
import { Colors } from '../theme/colors';

interface NeuInputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

export const NeuInput: React.FC<NeuInputProps> = ({
  label,
  icon,
  error,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, icon ? styles.inputWithIcon : null, style]}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2DDD5',
    height: 50,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.rose,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    height: '100%',
    padding: 0,
  },
  inputWithIcon: {
    paddingLeft: 2,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.rose,
    marginTop: 4,
  },
});
