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

interface LoginScreenProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
  onNavigateToSignUp?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onLoginSuccess,
  onNavigateToSignUp,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email.trim() === '' || password === '') {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Email or password is incorrect.');
        setLoading(false);
        return;
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError('Connection error. Please try again.');
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to keep listening to your music</Text>

          <AuthInput
            icon="mail-outline"
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
          />
          <AuthInput
            icon="lock-closed-outline"
            placeholder="Password"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            onSubmitEditing={handleLogin}
            error={error}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignUp}>
              <Text style={styles.switchLink}>Sign up</Text>
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
