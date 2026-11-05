import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({ icon, label, error, isPassword, ...inputProps }) => {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputPill,
          focused && styles.inputPillFocused,
          !!error && styles.inputPillError,
        ]}
      >
        <Ionicons name={icon} size={20} color={COLORS.textMuted} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPassword && !passwordVisible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 18,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    height: 52,
    paddingHorizontal: 18,
  },
  inputPillFocused: {
    borderColor: COLORS.primary,
  },
  inputPillError: {
    borderColor: '#E53935',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 6,
    marginLeft: 18,
  },
});
