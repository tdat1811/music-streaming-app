import React from 'react';
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { toImageSource } from '../utils/imageSource';
import { Badge, BadgeTone } from './ArtistUi';

// Thành phần giao diện dùng chung cho các màn Artist Studio

const SONG_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  published: { label: 'Published', tone: 'ok' },
  draft: { label: 'Draft', tone: 'pending' },
  hidden: { label: 'Hidden', tone: 'grey' },
};

export const SongStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = SONG_STATUS[status] ?? SONG_STATUS.published;
  return <Badge label={s.label} tone={s.tone} />;
};

// Ảnh bìa vuông; chưa có ảnh thì hiện ô màu có biểu tượng
export const CoverImage: React.FC<{ uri?: string | null; size?: number; radius?: number; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> }> = ({
  uri,
  size = 48,
  radius = 10,
  icon = 'musical-note',
  style,
}) =>
  uri ? (
    <Image source={toImageSource(uri)} style={[{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.tagBg }, style as any]} />
  ) : (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }, style]}>
      <Ionicons name={icon} size={size * 0.4} color={COLORS.textMuted} />
    </View>
  );

// Bảng chọn trượt từ dưới lên (menu thao tác)
export const BottomSheet: React.FC<{ visible: boolean; onClose: () => void; children: React.ReactNode }> = ({ visible, onClose, children }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.sheet}>
        <View style={styles.grab} />
        {children}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export const SheetAction: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}> = ({ icon, label, hint, danger, disabled, onPress }) => (
  <TouchableOpacity style={[styles.action, disabled && styles.disabled]} onPress={onPress} disabled={disabled} accessibilityLabel={label}>
    <Ionicons name={icon} size={18} color={danger ? '#E11D48' : COLORS.textPrimary} />
    <View style={styles.flex}>
      <Text style={[styles.actionText, danger && { color: '#E11D48' }]}>{label}</Text>
      {!!hint && <Text style={styles.actionHint}>{hint}</Text>}
    </View>
  </TouchableOpacity>
);

// Hộp xác nhận ở giữa màn hình
export const ConfirmDialog: React.FC<{ visible: boolean; title: string; message: string; children: React.ReactNode; onClose: () => void }> = ({
  visible,
  title,
  message,
  children,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.center}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>{title}</Text>
        <Text style={styles.dialogText}>{message}</Text>
        {children}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeholder: { backgroundColor: COLORS.tagBg, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  actionText: { fontSize: 14.5, fontWeight: '600', color: COLORS.textPrimary },
  actionHint: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  disabled: { opacity: 0.45 },
  center: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 28 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  dialogText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 18 },
});
