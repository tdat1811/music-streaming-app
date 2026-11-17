import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { ArtistRequestData, ArtistRequestForm } from '../../src/utils/artistRequest';
import { formatDateTime } from '../../src/utils/time';
import { AppButton, Badge, NoticeBox, ScreenHeader, STATUS_BADGE, Timeline } from '../../src/components/ArtistUi';

interface ArtistRequestStatusScreenProps {
  onBack?: () => void;
  onBecomeArtist?: () => void;
  onEditResubmit?: (initial: Partial<ArtistRequestForm>) => void;
  onOpenStudio?: () => void;
}

// A4 / A5: trạng thái yêu cầu làm nghệ sĩ (đang chờ, bị từ chối, được duyệt)
export const ArtistRequestStatusScreen: React.FC<ArtistRequestStatusScreenProps> = ({
  onBack,
  onBecomeArtist,
  onEditResubmit,
  onOpenStudio,
}) => {
  const { reloadAccount } = useAuth();
  const [request, setRequest] = useState<ArtistRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.artistRequests.getMine();
      setRequest(res?.data ?? null);
      // Được duyệt: tải lại tài khoản để app nhận role mới (artist)
      if (res?.data?.status === 'approved') reloadAccount();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [reloadAccount]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelRequest = async () => {
    setCancelling(true);
    try {
      const res = await api.artistRequests.cancelMine();
      setRequest(res?.data ?? null);
      setConfirmCancel(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  const renderBody = () => {
    if (loading) return <ActivityIndicator style={styles.loader} color={COLORS.primary} />;
    if (error) {
      return (
        <View style={styles.content}>
          <NoticeBox tone="error">{error}</NoticeBox>
          <AppButton label="Try again" variant="outline" onPress={load} style={styles.mt12} />
        </View>
      );
    }
    if (!request || request.status === 'cancelled') {
      return (
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: '#E6FAFB' }]}><Ionicons name="mic" size={32} color={COLORS.primaryDark} /></View>
            <Text style={styles.heroTitle}>{request ? 'Request cancelled' : 'No request yet'}</Text>
            <Text style={styles.heroSub}>Create your artist page and share your music with listeners.</Text>
          </View>
          <AppButton label="Become an artist" onPress={onBecomeArtist} />
        </View>
      );
    }

    const badge = STATUS_BADGE[request.status];
    const submitted = { title: 'Submitted', subtitle: formatDateTime(request.createdAt), state: 'done' as const };
    const steps =
      request.status === 'pending'
        ? [submitted, { title: 'Under review', subtitle: 'Usually 1–2 days', state: 'now' as const }, { title: 'Result', subtitle: 'Approved or needs changes', state: 'todo' as const }]
        : [
            submitted,
            { title: 'Reviewed', subtitle: formatDateTime(request.reviewedAt), state: 'done' as const },
            request.status === 'approved'
              ? { title: 'Approved', subtitle: 'Your artist page is ready', state: 'done' as const }
              : { title: 'Not approved', subtitle: 'See the reason below', state: 'bad' as const },
          ];

    return (
      <View style={styles.content}>
        {request.status === 'pending' && (
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="time-outline" size={34} color="#D97706" /></View>
            <Text style={styles.heroTitle}>Request sent!</Text>
            <Text style={styles.heroSub}>We'll notify you when an admin reviews it.</Text>
          </View>
        )}
        {request.status === 'approved' && (
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: '#DCFCE7' }]}><Ionicons name="checkmark" size={36} color="#16A34A" /></View>
            <Text style={styles.heroTitle}>You're now an artist! 🎉</Text>
            <Text style={styles.heroSub}>Your artist page "{request.stageName}" is ready.</Text>
          </View>
        )}

        <View style={styles.box}>
          <View style={styles.boxHead}>
            <Text style={styles.boxTitle}>{request.stageName}</Text>
            <Badge label={badge.label} tone={badge.tone} />
          </View>
          <Timeline steps={steps} />
        </View>

        {request.status === 'rejected' && (
          <>
            <Text style={styles.sectionTitle}>Reason from admin</Text>
            <NoticeBox tone="error">
              <Text style={styles.reasonTitle}>{request.rejectReasonText || 'Not approved'}.</Text>
              {!!request.rejectNote && <Text style={styles.reasonText}>{request.rejectNote}</Text>}
            </NoticeBox>
          </>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (loading || error || !request || request.status === 'cancelled') return null;
    if (request.status === 'pending') {
      return (
        <>
          <AppButton label="Back to profile" variant="outline" onPress={onBack} />
          <AppButton label="Cancel request" variant="ghost" textColor="#E11D48" onPress={() => setConfirmCancel(true)} />
        </>
      );
    }
    if (request.status === 'rejected') {
      return (
        <>
          <AppButton
            label="Edit & resubmit"
            onPress={() =>
              onEditResubmit?.({
                stageName: request.stageName,
                genres: request.genres,
                bio: request.bio,
                socialLinks: request.socialLinks,
                avatarImage: request.avatarImage,
              })
            }
          />
          <AppButton label="Back to profile" variant="ghost" onPress={onBack} />
        </>
      );
    }
    return (
      <>
        <AppButton label="Open Artist Studio" onPress={onOpenStudio} />
        <AppButton label="Back to profile" variant="ghost" onPress={onBack} />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Artist request" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>{renderBody()}</ScrollView>
      <View style={styles.footer}>{renderFooter()}</View>

      <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => setConfirmCancel(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Cancel your request?</Text>
            <Text style={styles.dialogText}>The admin won't review it. You can send a new request later.</Text>
            <AppButton label="Cancel request" variant="danger" onPress={cancelRequest} loading={cancelling} />
            <AppButton label="Keep waiting" variant="ghost" onPress={() => setConfirmCancel(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  loader: { marginTop: 60 },
  hero: { alignItems: 'center', marginVertical: 14 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center' },
  heroSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  box: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginTop: 6 },
  boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  boxTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flexShrink: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 18, marginBottom: 8 },
  reasonTitle: { fontSize: 13, fontWeight: '800', color: '#9F1239' },
  reasonText: { fontSize: 13, color: '#9F1239', marginTop: 4, lineHeight: 19 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
  mt12: { marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 32 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#111216', marginBottom: 8 },
  dialogText: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
});
