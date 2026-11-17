import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { initials } from '../utils/artistRequest';
import { toImageSource } from '../utils/imageSource';

// Thành phần giao diện dùng chung cho các màn đăng ký nghệ sĩ và Admin

const AVATAR_GRADIENTS = ['#F59E0B', '#6366F1', '#10B981', '#7B2CBF', '#EC4899', '#0EA5B5'];

// Ảnh đại diện: có ảnh thì hiện ảnh, không có thì hiện chữ cái đầu trên nền màu (màu cố định theo tên)
export const NameAvatar: React.FC<{ name?: string | null; image?: string | null; size?: number }> = ({ name: rawName, image, size = 48 }) => {
  const name = rawName || '?';
  const color = AVATAR_GRADIENTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];
  if (image) {
    return <Image source={toImageSource(image)} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials(name)}</Text>
    </View>
  );
};

export type BadgeTone = 'pending' | 'ok' | 'bad' | 'grey' | 'artist' | 'admin' | 'lock';

const BADGE_COLORS: Record<BadgeTone, { bg: string; fg: string }> = {
  pending: { bg: '#FEF3C7', fg: '#D97706' },
  ok: { bg: '#DCFCE7', fg: '#16A34A' },
  bad: { bg: '#FFE4E6', fg: '#E11D48' },
  grey: { bg: '#F3F4F6', fg: '#686A70' },
  artist: { bg: '#E6FAFB', fg: '#0EA5B5' },
  admin: { bg: '#F3E8FF', fg: '#7B2CBF' },
  lock: { bg: '#111216', fg: '#FFFFFF' },
};

export const Badge: React.FC<{ label: string; tone: BadgeTone; icon?: keyof typeof Ionicons.glyphMap }> = ({ label, tone, icon }) => {
  const c = BADGE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={11} color={c.fg} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
};

export const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending review', tone: 'pending' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Needs changes', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'grey' },
};

// Thanh tiêu đề: nút quay lại, tiêu đề ở giữa, phần tử bên phải tuỳ chọn
export const ScreenHeader: React.FC<{ title: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.headerSide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Back">
      <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
    </TouchableOpacity>
    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
  </View>
);

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppButton: React.FC<ButtonProps> = ({ label, onPress, variant = 'primary', disabled, loading, textColor, style }) => (
  <TouchableOpacity
    style={[styles.btn, styles[`btn_${variant}`], (disabled || loading) && styles.btnDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text style={[styles.btnText, styles[`btnText_${variant}`], textColor ? { color: textColor } : null]}>
      {loading ? 'Please wait…' : label}
    </Text>
  </TouchableOpacity>
);

// Mốc thời gian (Submitted -> Under review -> Result)
export type TimelineState = 'done' | 'now' | 'todo' | 'bad';
export const Timeline: React.FC<{ steps: { title: string; subtitle?: string; state: TimelineState }[] }> = ({ steps }) => (
  <View>
    {steps.map((step, i) => (
      <View key={step.title} style={styles.tlRow}>
        <View style={styles.tlLeft}>
          <View style={[styles.tlDot, styles[`tl_${step.state}`]]}>
            {step.state === 'done' && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            {step.state === 'bad' && <Ionicons name="close" size={14} color="#FFFFFF" />}
          </View>
          {i < steps.length - 1 && <View style={styles.tlLine} />}
        </View>
        <View style={styles.tlBody}>
          <Text style={styles.tlTitle}>{step.title}</Text>
          {!!step.subtitle && <Text style={styles.tlSub}>{step.subtitle}</Text>}
        </View>
      </View>
    ))}
  </View>
);

// Hộp thông báo màu (info / ok / warn / error)
export const NoticeBox: React.FC<{ tone: 'info' | 'ok' | 'warn' | 'error'; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  tone,
  children,
  style,
}) => (
  <View style={[styles.notice, styles[`notice_${tone}`], style]}>
    {typeof children === 'string' ? <Text style={[styles.noticeText, styles[`noticeText_${tone}`]]}>{children}</Text> : children}
  </View>
);

export const noticeTextStyle = (tone: 'info' | 'ok' | 'warn' | 'error') => [styles.noticeText, styles[`noticeText_${tone}`]];

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerSide: { minWidth: 70 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btn_primary: { backgroundColor: COLORS.primary },
  btn_outline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: COLORS.border },
  btn_danger: { backgroundColor: '#E11D48' },
  btn_ghost: { backgroundColor: 'transparent', height: 42 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '800' },
  btnText_primary: { color: '#FFFFFF' },
  btnText_outline: { color: COLORS.textPrimary },
  btnText_danger: { color: '#FFFFFF' },
  btnText_ghost: { color: COLORS.textSecondary, fontWeight: '600' },
  tlRow: { flexDirection: 'row' },
  tlLeft: { alignItems: 'center', width: 24 },
  tlDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tl_done: { backgroundColor: COLORS.primary },
  tl_now: { backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: '#D97706' },
  tl_todo: { backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: COLORS.border },
  tl_bad: { backgroundColor: '#E11D48' },
  tlLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: COLORS.border },
  tlBody: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  tlTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  tlSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notice: { borderRadius: 12, padding: 12, borderWidth: 1 },
  notice_info: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  notice_ok: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  notice_warn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  notice_error: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  noticeText: { fontSize: 13, lineHeight: 19 },
  noticeText_info: { color: '#075985' },
  noticeText_ok: { color: '#166534' },
  noticeText_warn: { color: '#92400E' },
  noticeText_error: { color: '#9F1239' },
});
