import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { api, isApiError } from '../services/api';
import { ADMIN_RULES, MAX_VIOLATIONS, REPORT_REASONS, ruleLabel, TargetType } from '../utils/moderation';
import { BottomSheet } from './StudioUi';
import { AppButton } from './ArtistUi';

// Thành phần dùng chung cho kiểm duyệt (giai đoạn 5)

// ●●○ = số vi phạm / 3 (đỏ = đã vi phạm)
export const StrikeDots: React.FC<{ count: number; showText?: boolean }> = ({ count, showText = true }) => (
  <View style={styles.dots} accessibilityLabel={`${count} of ${MAX_VIOLATIONS} violations`}>
    {Array.from({ length: MAX_VIOLATIONS }, (_, i) => (
      <View key={i} style={[styles.dot, i < count && styles.dotOn]} />
    ))}
    {showText && <Text style={[styles.dotText, count >= MAX_VIOLATIONS && styles.dotTextBad]}>{count > MAX_VIOLATIONS ? count : `${count}/${MAX_VIOLATIONS}`}</Text>}
  </View>
);

const RadioRow: React.FC<{ label: string; on: boolean; onPress: () => void; tone?: 'danger' | 'primary' }> = ({ label, on, onPress, tone = 'danger' }) => (
  <TouchableOpacity style={styles.radioRow} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}>
    <View style={[styles.radio, on && (tone === 'danger' ? styles.radioOnDanger : styles.radioOnPrimary)]} />
    <Text style={styles.radioText}>{label}</Text>
  </TouchableOpacity>
);

// Admin chọn quy định bị vi phạm (+ ghi chú). Dùng cho gỡ nội dung, khoá tài khoản, ẩn trang nghệ sĩ.
export const RuleSheet: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  // Hộp cảnh báo đỏ (VD lần gỡ này sẽ khoá tài khoản)
  warning?: string | null;
  confirmLabel: string;
  noteHint?: string;
  onClose: () => void;
  // Trả về null nếu thành công, ngược lại là thông báo lỗi để hiện trong bảng
  onConfirm: (data: { rule: string; note: string }) => Promise<string | null>;
}> = ({ visible, title, message, warning, confirmLabel, noteHint = 'Note for the record (optional, only admins see it)', onClose, onConfirm }) => {
  const [rule, setRule] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRule('');
    setNote('');
    setError(null);
  }, [visible]);

  const submit = async () => {
    if (!rule) return setError('Please choose a rule.');
    setBusy(true);
    const err = await onConfirm({ rule, note: note.trim() });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!warning && <Text style={styles.warning}>{warning}</Text>}
      <Text style={styles.label}>Rule broken (sent to the author) *</Text>
      {ADMIN_RULES.map((r) => (
        <RadioRow key={r} label={ruleLabel(r)} on={rule === r} onPress={() => { setRule(r); setError(null); }} />
      ))}
      <TextInput
        style={styles.note}
        value={note}
        onChangeText={setNote}
        placeholder={noteHint}
        placeholderTextColor={COLORS.textMuted}
        multiline
        maxLength={300}
        accessibilityLabel="Moderator note"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <AppButton label={confirmLabel} variant="danger" onPress={submit} loading={busy} />
      <AppButton label="Cancel" variant="ghost" onPress={onClose} />
    </BottomSheet>
  );
};

const TARGET_WORD: Record<TargetType, string> = { song: 'song', post: 'post', comment: 'comment' };

// Người nghe báo cáo bài hát / bài đăng / bình luận (màn L1)
export const ReportSheet: React.FC<{
  target: { type: TargetType; id: string; preview?: string } | null;
  onClose: () => void;
  // Gửi xong (để hiện lời cảm ơn)
  onSent?: (message: string) => void;
}> = ({ target, onClose, onSent }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Gửi xong: hiện lời cảm ơn ngay trong bảng
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setReason('');
    setDetails('');
    setError(null);
    setSent(null);
  }, [target]);

  const send = async () => {
    if (!target) return;
    if (!reason) return setError('Please choose a reason.');
    setBusy(true);
    try {
      const res = await api.reports.create({ targetType: target.type, targetId: target.id, reason, details: details.trim() });
      const message = res.message || "Thanks, we'll review it.";
      setSent(message);
      onSent?.(message);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={!!target} onClose={onClose}>
      {sent ? (
        <View style={styles.sent}>
          <View style={styles.sentIcon}><Text style={styles.sentCheck}>✓</Text></View>
          <Text style={styles.title}>Report sent</Text>
          <Text style={[styles.message, styles.center]}>{sent}</Text>
          <AppButton label="Done" onPress={onClose} style={styles.sentBtn} />
        </View>
      ) : (
      <>
      <Text style={styles.title}>Report this {target ? TARGET_WORD[target.type] : ''}</Text>
      {!!target?.preview && <Text style={styles.quote} numberOfLines={3}>"{target.preview}"</Text>}
      <Text style={styles.label}>Why are you reporting it? *</Text>
      {REPORT_REASONS.map((r) => (
        <RadioRow key={r} label={ruleLabel(r)} on={reason === r} tone="primary" onPress={() => { setReason(r); setError(null); }} />
      ))}
      <TextInput
        style={styles.note}
        value={details}
        onChangeText={setDetails}
        placeholder="Add details (optional)"
        placeholderTextColor={COLORS.textMuted}
        multiline
        maxLength={300}
        accessibilityLabel="Report details"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <AppButton label="Send report" onPress={send} loading={busy} />
      <AppButton label="Cancel" variant="ghost" onPress={onClose} />
      </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotOn: { backgroundColor: '#E11D48' },
  dotText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginLeft: 3 },
  dotTextBad: { color: '#E11D48' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  message: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 19 },
  warning: { marginTop: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 12, padding: 10, fontSize: 12.5, color: '#9F1239', lineHeight: 18, fontWeight: '600' },
  quote: { backgroundColor: COLORS.tagBg, borderRadius: 12, padding: 10, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 12, marginBottom: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.textMuted },
  radioOnDanger: { borderWidth: 6, borderColor: '#E11D48' },
  radioOnPrimary: { borderWidth: 6, borderColor: COLORS.primary },
  radioText: { fontSize: 14, color: COLORS.textPrimary },
  note: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, minHeight: 56, fontSize: 13.5, color: COLORS.textPrimary, marginTop: 6, marginBottom: 10, textAlignVertical: 'top' },
  error: { color: '#E11D48', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  sent: { alignItems: 'center', paddingVertical: 10 },
  sentIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sentCheck: { fontSize: 26, color: '#16A34A', fontWeight: '900' },
  center: { textAlign: 'center' },
  sentBtn: { alignSelf: 'stretch', marginTop: 16 },
});
