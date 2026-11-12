import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { AuthInput } from '../../src/components/AuthInput';
import { useAuth } from '../../src/context/AuthContext';
import { SignUpField, validateSignUp } from '../../src/utils/validation';

type Field = SignUpField;

interface SignUpScreenProps {
  onBack?: () => void;
  onSignUpSuccess?: () => void;
  onNavigateToLogin?: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onBack,
  onSignUpSuccess,
  onNavigateToLogin,
}) => {
  const { signUp } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [loading, setLoading] = useState(false);

  const updateField = (field: Field, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSignUp = async () => {
    // Quy tắc kiểm tra nằm ở utils/validation.ts (có kiểm thử đơn vị UT09)
    const nextErrors = validateSignUp(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const success = await signUp(values.name, values.email, values.password);
      if (!success) {
        setErrors({ email: 'This email is already registered.' });
        setLoading(false);
        return;
      }
      if (onSignUpSuccess) onSignUpSuccess();
    } catch (err) {
      setErrors({ email: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image source={IMAGES.homeLogo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>Sign up to choose a plan and start listening</Text>

          <AuthInput
            icon="person-outline"
            placeholder="Full name"
            autoCapitalize="words"
            value={values.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
          />
          <AuthInput
            icon="mail-outline"
            placeholder="Email"
            keyboardType="email-address"
            value={values.email}
            onChangeText={(text) => updateField('email', text)}
            error={errors.email}
          />
          <AuthInput
            icon="lock-closed-outline"
            placeholder="Password"
            isPassword
            value={values.password}
            onChangeText={(text) => updateField('password', text)}
            error={errors.password}
          />
          <AuthInput
            icon="lock-closed-outline"
            placeholder="Confirm password"
            isPassword
            value={values.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            onSubmitEditing={handleSignUp}
            error={errors.confirmPassword}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} activeOpacity={0.85} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.switchLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  logo: {
    width: 56,
    height: 38,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: COLORS.black,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
