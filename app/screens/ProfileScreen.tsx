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
import { useAuth, EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from '../../src/context/AuthContext';

const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;

type InfoField = 'name' | 'email' | 'phone';
type PasswordField = 'current' | 'next' | 'confirm';

const EMPTY_PASSWORDS: Record<PasswordField, string> = { current: '', next: '', confirm: '' };

interface ProfileScreenProps {
  onBack?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToLogin?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onNavigateToPlans,
  onNavigateToLogin,
}) => {
  const { currentUser, activePlan, isVip, updateProfile, changePassword } = useAuth();

  const [info, setInfo] = useState<Record<InfoField, string>>({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    phone: currentUser?.phone ?? '',
  });
  const [infoErrors, setInfoErrors] = useState<Partial<Record<InfoField, string>>>({});
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);

  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const updateInfo = (field: InfoField, text: string) => {
    setInfo((prev) => ({ ...prev, [field]: text }));
    setInfoErrors((prev) => ({ ...prev, [field]: undefined }));
    setInfoSaved(false);
  };

  const updatePassword = (field: PasswordField, text: string) => {
    setPasswords((prev) => ({ ...prev, [field]: text }));
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
    setPasswordSaved(false);
  };

  const handleSaveInfo = async () => {
    const nextErrors: Partial<Record<InfoField, string>> = {};
    if (info.name.trim() === '') {
      nextErrors.name = 'Please enter your name.';
    }
    if (!EMAIL_PATTERN.test(info.email.trim())) {
      nextErrors.email = 'Please enter a valid email.';
    }
    if (info.phone.trim() !== '' && !PHONE_PATTERN.test(info.phone.trim())) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }
    setInfoErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setInfoLoading(true);
    try {
      const success = await updateProfile(info);
      if (!success) {
        setInfoErrors({ email: 'This email is already registered.' });
        return;
      }
      setInfoSaved(true);
    } catch (err) {
      setInfoErrors({ email: 'Connection error. Please try again.' });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const nextErrors: Partial<Record<PasswordField, string>> = {};
    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      nextErrors.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (passwords.confirm !== passwords.next) {
      nextErrors.confirm = 'Passwords do not match.';
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordLoading(true);
    try {
      const success = await changePassword(passwords.current, passwords.next);
      if (!success) {
        setPasswordErrors({ current: 'Current password is incorrect.' });
        return;
      }
      setPasswords(EMPTY_PASSWORDS);
      setPasswordSaved(true);
    } catch (err) {
      setPasswordErrors({ current: 'Connection error. Please try again.' });
    } finally {
      setPasswordLoading(false);
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
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerIconBtn} />
        </View>

        {!currentUser ? (
          <View style={styles.guestContainer}>
            <Text style={styles.guestText}>Log in to view and update your profile</Text>
            <TouchableOpacity
              style={[styles.primaryButton, styles.guestButton]}
              onPress={onNavigateToLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Log in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Account summary */}
            <View style={styles.summary}>
              <Image source={IMAGES.homeAvatar} style={styles.avatar} fadeDuration={0} />
              <Text style={styles.summaryName}>{currentUser.name}</Text>
              <Text style={styles.summaryEmail}>{currentUser.email}</Text>
            </View>

            {/* Membership */}
            <View style={styles.planCard}>
              <View style={styles.planInfo}>
                <Text style={styles.planLabel}>Membership</Text>
                {activePlan && isVip ? (
                  <View style={styles.vipBadge}>
                    <Ionicons name="diamond" size={12} color="#FFFFFF" />
                    <Text style={styles.vipBadgeText}>VIP • {activePlan.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.planValue}>Free account</Text>
                )}
              </View>
              <TouchableOpacity onPress={onNavigateToPlans} activeOpacity={0.7}>
                <Text style={styles.linkText}>{isVip ? 'Change plan' : 'View plans'}</Text>
              </TouchableOpacity>
            </View>

            {/* Personal information */}
            <Text style={styles.sectionTitle}>Personal information</Text>
            <AuthInput
              icon="person-outline"
              label="Full name"
              placeholder="Full name"
              autoCapitalize="words"
              value={info.name}
              onChangeText={(text) => updateInfo('name', text)}
              error={infoErrors.name}
            />
            <AuthInput
              icon="mail-outline"
              label="Email"
              placeholder="Email"
              keyboardType="email-address"
              value={info.email}
              onChangeText={(text) => updateInfo('email', text)}
              error={infoErrors.email}
            />
            <AuthInput
              icon="call-outline"
              label="Phone number"
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={info.phone}
              onChangeText={(text) => updateInfo('phone', text)}
              error={infoErrors.phone}
            />
            {infoSaved && <Text style={styles.successText}>Your profile has been updated.</Text>}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveInfo} activeOpacity={0.85} disabled={infoLoading}>
              {infoLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>

            {/* Change password */}
            <Text style={[styles.sectionTitle, styles.passwordTitle]}>Change password</Text>
            <AuthInput
              icon="lock-closed-outline"
              label="Current password"
              placeholder="Current password"
              isPassword
              value={passwords.current}
              onChangeText={(text) => updatePassword('current', text)}
              error={passwordErrors.current}
            />
            <AuthInput
              icon="lock-closed-outline"
              label="New password"
              placeholder="New password"
              isPassword
              value={passwords.next}
              onChangeText={(text) => updatePassword('next', text)}
              error={passwordErrors.next}
            />
            <AuthInput
              icon="lock-closed-outline"
              label="Confirm new password"
              placeholder="Confirm new password"
              isPassword
              value={passwords.confirm}
              onChangeText={(text) => updatePassword('confirm', text)}
              error={passwordErrors.confirm}
            />
            {passwordSaved && <Text style={styles.successText}>Your password has been changed.</Text>}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleChangePassword}
              activeOpacity={0.85}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Update password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  summaryName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  summaryEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  planInfo: {
    alignItems: 'flex-start',
    gap: 6,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  planValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7B2CBF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  vipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  passwordTitle: {
    marginTop: 32,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.black,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  guestText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  guestButton: {
    alignSelf: 'stretch',
  },
});
