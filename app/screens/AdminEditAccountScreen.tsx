import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/theme';
import { AuthInput } from '../../src/components/AuthInput';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, useAuth } from '../../src/context/AuthContext';
import { AppButton, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';

interface AdminEditAccountScreenProps {
  // info: sửa tên & email; password: đổi mật khẩu
  mode: 'info' | 'password';
  onBack?: () => void;
}

// Sửa tài khoản admin (dùng lại API hồ sơ / đổi mật khẩu đang có)
export const AdminEditAccountScreen: React.FC<AdminEditAccountScreenProps> = ({ mode, onBack }) => {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const saveInfo = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name.';
    if (!EMAIL_PATTERN.test(email.trim())) e.email = 'Please enter a valid email.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setMessage(null);
    const ok = await updateProfile({ name, email, phone: currentUser?.phone ?? '' }).catch(() => false);
    setSaving(false);
    setMessage(ok ? { tone: 'ok', text: 'Your account has been updated.' } : { tone: 'error', text: 'This email is already registered.' });
  };

  const savePassword = async () => {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Please enter your current password.';
    if (next.length < MIN_PASSWORD_LENGTH) e.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== next) e.confirm = 'Passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setMessage(null);
    const ok = await changePassword(current, next).catch(() => false);
    setSaving(false);
    if (ok) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ tone: 'ok', text: 'Your password has been changed.' });
    } else {
      setErrors({ current: 'Current password is incorrect.' });
    }
  };

  const clear = (key: string) => setErrors((p) => ({ ...p, [key]: '' }));

  return (
    <AdminShell title={mode === 'info' ? 'Edit name & email' : 'Change password'} onBack={onBack} white>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mode === 'info' ? (
            <>
              <AuthInput icon="person-outline" label="Full name" placeholder="Full name" value={name} onChangeText={(t) => { setName(t); clear('name'); }} error={errors.name} autoCapitalize="words" />
              <AuthInput icon="mail-outline" label="Email" placeholder="Email" value={email} onChangeText={(t) => { setEmail(t); clear('email'); }} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
            </>
          ) : (
            <>
              <AuthInput icon="lock-closed-outline" label="Current password" placeholder="Current password" value={current} onChangeText={(t) => { setCurrent(t); clear('current'); }} error={errors.current} isPassword />
              <AuthInput icon="lock-closed-outline" label="New password" placeholder="New password" value={next} onChangeText={(t) => { setNext(t); clear('next'); }} error={errors.next} isPassword />
              <AuthInput icon="lock-closed-outline" label="Confirm new password" placeholder="Confirm new password" value={confirm} onChangeText={(t) => { setConfirm(t); clear('confirm'); }} error={errors.confirm} isPassword />
            </>
          )}
          {!!message && <NoticeBox tone={message.tone} style={styles.mt12}>{message.text}</NoticeBox>}
          <Text style={styles.hint}>{mode === 'info' ? 'This is the account you use to sign in to the admin area.' : `At least ${MIN_PASSWORD_LENGTH} characters.`}</Text>
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <AppButton label="Save" onPress={mode === 'info' ? saveInfo : savePassword} loading={saving} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  mt12: { marginTop: 12 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
});
