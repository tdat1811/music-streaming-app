import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { ARTIST_LIMITS, ArtistRequestData, REJECT_REASONS, validateRejectForm } from '../../src/utils/artistRequest';
import { formatDateTime } from '../../src/utils/time';
import { formatDate } from '../../src/utils/plan';
import { AppButton, Badge, NameAvatar, NoticeBox, STATUS_BADGE } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';

interface AdminRequestDetailScreenProps {
  requestId: string | null;
  onBack?: () => void;
  // Gọi sau khi duyệt / từ chối thành công (quay lại danh sách)
  onReviewed?: () => void;
}

const openLink = (link: string) => {
  const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  Linking.openURL(url).catch(() => {});
};

// B4–B6: chi tiết yêu cầu, xác nhận duyệt, từ chối kèm lý do
export const AdminRequestDetailScreen: React.FC<AdminRequestDetailScreenProps> = ({ requestId, onBack, onReviewed }) => {
  const [request, setRequest] = useState<ArtistRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'approve' | 'reject' | null>(null);
  const [verified, setVerified] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) {
      setError('No request selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getRequest(requestId);
      setRequest(res.data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const openSheet = (kind: 'approve' | 'reject') => {
    setSheetError(null);
    setVerified(false);
    setReason(null);
    setNote('');
    setSheet(kind);
  };

  const handleResult = async (err: unknown) => {
    if (isApiError(err) && (err.code === 'ALREADY_REVIEWED' || err.code === 'NAME_TAKEN' || err.code === 'USER_NOT_LISTENER')) {
      // Dữ liệu ở máy chủ đã thay đổi (VD admin khác vừa xử lý): đóng bảng, tải lại rồi báo lý do
      setSheet(null);
      await load();
      setError(err.message);
      return;
    }
    setSheetError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
  };

  const approve = async () => {
    if (!request) return;
    setSaving(true);
    setSheetError(null);
    try {
      await api.admin.approve(request.id, verified);
      setSheet(null);
      onReviewed?.();
    } catch (err) {
      handleResult(err);
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!request) return;
    const formError = validateRejectForm(reason, note);
    if (formError) {
      setSheetError(formError);
      return;
    }
    setSaving(true);
    setSheetError(null);
    try {
      await api.admin.reject(request.id, reason as string, note.trim());
      setSheet(null);
      onReviewed?.();
    } catch (err) {
      handleResult(err);
    } finally {
      setSaving(false);
    }
  };

  const badge = request ? STATUS_BADGE[request.status] : null;
  const isPending = request?.status === 'pending';

  return (
    <AdminShell title="Request detail" onBack={onBack} right={badge ? <Badge label={badge.label} tone={badge.tone} /> : null} white>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : !request ? (
          <>
            <NoticeBox tone="error">{error ?? 'Request not found.'}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={load} style={styles.mt12} />
          </>
        ) : (
          <>
            {!!error && <NoticeBox tone="warn" style={styles.mb12}>{error}</NoticeBox>}
            {/* Xem trước trang nghệ sĩ */}
            <View style={styles.head}>
              <NameAvatar name={request.stageName} image={request.avatarImage} size={64} />
              <View style={styles.flex}>
                <Text style={styles.stageName}>{request.stageName}</Text>
                <View style={styles.badges}>{request.genres.map((g) => <Badge key={g} label={g} tone="grey" />)}</View>
              </View>
            </View>
            <Text style={styles.bio}>{request.bio}</Text>
            {request.socialLinks.map((l) => (
              <TouchableOpacity key={l} style={styles.linkRow} onPress={() => openLink(l)} accessibilityLabel={`Open ${l}`}>
                <Ionicons name="link" size={15} color={COLORS.primary} />
                <Text style={styles.link} numberOfLines={1}>{l}</Text>
                <Ionicons name="open-outline" size={13} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            {request.socialLinks.length === 0 && <Text style={styles.muted}>No social links.</Text>}

            {isPending && (
              <NoticeBox tone={request.nameAvailable ? 'ok' : 'error'} style={styles.mt12}>
                {request.nameAvailable
                  ? '✓ Stage name available'
                  : '✕ This stage name is already used by another artist page or request.'}
              </NoticeBox>
            )}
            {request.status === 'rejected' && (
              <NoticeBox tone="error" style={styles.mt12}>
                {`Rejected: ${request.rejectReasonText}${request.rejectNote ? `\n${request.rejectNote}` : ''}`}
              </NoticeBox>
            )}
            {request.status === 'approved' && (
              <NoticeBox tone="ok" style={styles.mt12}>{`Approved · ${formatDateTime(request.reviewedAt)}${request.verified ? ' · Verified ✓' : ''}`}</NoticeBox>
            )}

            <Text style={styles.section}>Applicant account</Text>
            {[
              ['Name', request.applicant?.name ?? '—'],
              ['Email', request.applicant?.email ?? '—'],
              ['Role', request.applicant?.role ? request.applicant.role[0].toUpperCase() + request.applicant.role.slice(1) : '—'],
              ['Member since', formatDate(request.applicant?.memberSince) || '—'],
              ['Previous requests', request.previousRequests ? String(request.previousRequests) : 'None'],
              ['Submitted', formatDateTime(request.createdAt)],
            ].map(([k, v], i, arr) => (
              <View key={k} style={[styles.kv, i === arr.length - 1 && styles.kvLast]}>
                <Text style={styles.kvKey}>{k}</Text>
                <Text style={styles.kvVal}>{v}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {isPending && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <AppButton label="Reject" variant="outline" textColor="#E11D48" onPress={() => openSheet('reject')} style={styles.flex} />
          <AppButton label="Approve" onPress={() => openSheet('approve')} style={styles.flex} disabled={!request?.nameAvailable} />
        </SafeAreaView>
      )}

      {/* B5: xác nhận duyệt */}
      <Modal visible={sheet === 'approve'} transparent animationType="slide" onRequestClose={() => { if (!saving) setSheet(null); }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>Approve "{request?.stageName}"?</Text>
            <Text style={styles.muted}>This will:</Text>
            {[
              <>Create a new artist page <Text style={styles.bold}>{request?.stageName}</Text></>,
              <>Change <Text style={styles.bold}>{request?.applicant?.email}</Text> to role <Text style={styles.bold}>Artist</Text> and link it to the page</>,
              <>Send the user a notification</>,
            ].map((line, i) => (
              <View key={i} style={styles.checkLine}>
                <Ionicons name="checkmark" size={16} color="#16A34A" />
                <Text style={styles.checkText}>{line}</Text>
              </View>
            ))}
            <View style={styles.toggleRow}>
              <View style={styles.flex}>
                <Text style={styles.bold}>Verified badge ✓</Text>
                <Text style={styles.mutedSmall}>Show a blue tick on the page</Text>
              </View>
              <Switch value={verified} onValueChange={setVerified} trackColor={{ true: COLORS.primary, false: '#CBD5E1' }} accessibilityLabel="Verified badge" />
            </View>
            {!!sheetError && <NoticeBox tone="error" style={styles.mb12}>{sheetError}</NoticeBox>}
            <AppButton label="Approve" onPress={approve} loading={saving} />
            <AppButton label="Cancel" variant="ghost" onPress={() => setSheet(null)} disabled={saving} />
          </View>
        </View>
      </Modal>

      {/* B6: từ chối */}
      <Modal visible={sheet === 'reject'} transparent animationType="slide" onRequestClose={() => { if (!saving) setSheet(null); }}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.grab} />
              <Text style={styles.sheetTitle}>Reject request</Text>
              <Text style={styles.muted}>Choose a reason. The user will see it.</Text>
              {REJECT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.code}
                  style={styles.radioLine}
                  onPress={() => {
                    setReason(r.code);
                    setSheetError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === r.code }}
                >
                  <View style={[styles.radio, reason === r.code && styles.radioOn]} />
                  <Text style={styles.radioText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.label}>Note to the user{reason === 'other' ? ' *' : ' (optional)'}</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={(t) => {
                  setNote(t);
                  setSheetError(null);
                }}
                multiline
                maxLength={ARTIST_LIMITS.rejectNoteMax}
                placeholder="Explain what to change"
                placeholderTextColor={COLORS.textMuted}
                textAlignVertical="top"
                accessibilityLabel="Note to the user"
              />
              {!!sheetError && <NoticeBox tone="error" style={styles.mb12}>{sheetError}</NoticeBox>}
              <AppButton label="Reject request" variant="danger" onPress={reject} loading={saving} />
              <AppButton label="Cancel" variant="ghost" onPress={() => setSheet(null)} disabled={saving} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  loader: { marginTop: 60 },
  mt12: { marginTop: 12 },
  mb12: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 10 },
  stageName: { fontSize: 19, fontWeight: '900', color: COLORS.textPrimary },
  badges: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  bio: { fontSize: 13.5, lineHeight: 20, color: COLORS.textPrimary, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  muted: { fontSize: 13, color: COLORS.textSecondary },
  mutedSmall: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  section: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 18, marginBottom: 4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  kvLast: { borderBottomWidth: 0 },
  kvKey: { fontSize: 13, color: COLORS.textSecondary },
  kvVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', flexShrink: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  checkLine: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  checkText: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 19 },
  bold: { fontWeight: '800', color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginVertical: 16 },
  radioLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.textMuted },
  radioOn: { borderWidth: 6, borderColor: '#E11D48' },
  radioText: { fontSize: 13.5, color: COLORS.textPrimary },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8, marginBottom: 5 },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 72, padding: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 12 },
});
