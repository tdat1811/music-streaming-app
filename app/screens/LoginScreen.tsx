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
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { AuthInput } from '../../src/components/AuthInput';
import { useAuth } from '../../src/context/AuthContext';
import { Modal } from 'react-native';

interface LoginScreenProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
  onNavigateToSignUp?: () => void;
  // Thông báo hiện sẵn khi mở màn hình (VD: phiên đăng nhập đã hết hạn)
  notice?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onLoginSuccess,
  onNavigateToSignUp,
  notice,
}) => {
  const { login, forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(notice ?? '');
  const [loading, setLoading] = useState(false);

  // States cho modal Quên mật khẩu
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleResetPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!forgotNewPassword) {
      setForgotError('Please enter your new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Confirm password does not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await forgotPassword(forgotEmail.trim(), forgotNewPassword);
      if (res.success) {
        setForgotSuccess(res.message);
        setEmail(forgotEmail.trim());
        setPassword(forgotNewPassword);
        setTimeout(() => {
          setForgotModalVisible(false);
          setForgotSuccess('');
        }, 1500);
      } else {
        setForgotError(res.message);
      }
    } catch {
      setForgotError('Failed to reset password. Please check your network.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async () => {
    if (email.trim() === '' || password === '') {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      // Chuỗi = lý do từ máy chủ (VD tài khoản bị khoá)
      if (typeof success === 'string') {
        setError(success);
        setLoading(false);
        return;
      }
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

          {/* Nút Quên mật khẩu */}
          <View style={styles.forgotRow}>
            <TouchableOpacity
              onPress={() => {
                setForgotEmail(email);
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setForgotError('');
                setForgotSuccess('');
                setForgotModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

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

      {/* Modal Quên mật khẩu */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key-outline" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>
                Enter your registered email and a new password to reset your account.
              </Text>
            </View>

            <AuthInput
              icon="mail-outline"
              placeholder="Registered email"
              keyboardType="email-address"
              value={forgotEmail}
              onChangeText={(text) => {
                setForgotEmail(text);
                setForgotError('');
              }}
            />

            <AuthInput
              icon="lock-closed-outline"
              placeholder="New password (min 6 chars)"
              isPassword
              value={forgotNewPassword}
              onChangeText={(text) => {
                setForgotNewPassword(text);
                setForgotError('');
              }}
            />

            <AuthInput
              icon="shield-checkmark-outline"
              placeholder="Confirm new password"
              isPassword
              value={forgotConfirmPassword}
              onChangeText={(text) => {
                setForgotConfirmPassword(text);
                setForgotError('');
              }}
            />

            {forgotError ? <Text style={styles.modalErrorText}>{forgotError}</Text> : null}
            {forgotSuccess ? <Text style={styles.modalSuccessText}>{forgotSuccess}</Text> : null}

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleResetPassword}
              disabled={forgotLoading}
              activeOpacity={0.85}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setForgotModalVisible(false)}
              disabled={forgotLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 14,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  modalSuccessText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: '#111216',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
