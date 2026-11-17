import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { timeAgoText } from '../../src/utils/time';
import { targetLabel } from '../../src/utils/moderation';
import { AppButton, Badge, BadgeTone, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';
import { ConfirmDialog } from '../../src/components/StudioUi';
import { RuleSheet, StrikeDots } from '../../src/components/ModerationUi';

const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
const TONE: Record<string, BadgeTone> = { song: 'bad', post: 'artist', comment: 'pending' };

interface AdminReportDetailScreenProps {
  targetType: string | null;
  targetId: string | null;
  onBack?: () => void;
  onOpenUser?: (id: string) => void;
}

// M2: chi tiết báo cáo – nội dung, tác giả và số vi phạm, danh sách người báo cáo; gỡ hoặc bỏ qua
export const AdminReportDetailScreen: React.FC<AdminReportDetailScreenProps> = ({ targetType, targetId, onBack, onOpenUser }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!targetType || !targetId) return;
      if (refresh) setRefreshing(true);
      setError(null);
      try {
        const res = await api.admin.getReport(targetType, targetId);
        setData(res.data);
      } catch (err) {
        setError(errText(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [targetType, targetId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (v: { rule: string; note: string }) => {
    try {
      const res = await api.admin.removeContent(targetType!, targetId!, v);
      setNotice({ tone: 'ok', text: res.message });
      await load();
      return null;
    } catch (err) {
      return errText(err);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      const res = await api.admin.dismissReports(targetType!, targetId!);
      setNotice({ tone: 'ok', text: res.message });
      await load();
    } catch (err) {
      setNotice({ tone: 'error', text: errText(err) });
    } finally {
      setBusy(false);
      setDismissOpen(false);
    }
  };

  const word = targetType ? targetLabel(targetType).toLowerCase() : 'content';
  const author = data?.author;
  const max = data?.maxViolations ?? 3;
  const open = data?.status === 'open' && data?.exists && !data?.removed;

  return (
    <AdminShell title="Report" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
          </>
        ) : (
          data && (
            <>
              {!!notice && <NoticeBox tone={notice.tone} style={styles.mb10}>{notice.text}</NoticeBox>}
              <View style={styles.panel}>
                <View style={styles.headRow}>
                  <Badge label={targetLabel(data.targetType)} tone={TONE[data.targetType] ?? 'grey'} />
                  <Text style={styles.sub}>{data.reports.length} report{data.reports.length === 1 ? '' : 's'}</Text>
                </View>
                <Text style={styles.quote}>{data.targetType === 'song' ? data.text : `"${data.text}"`}</Text>
                {author ? (
                  <>
                    <TouchableOpacity style={styles.kv} onPress={() => onOpenUser?.(author.id)} accessibilityLabel="Open author account">
                      <Text style={styles.k}>Author</Text>
                      <Text style={[styles.v, styles.linkText]} numberOfLines={1}>{author.name}{author.locked ? ' (locked)' : ''} ›</Text>
                    </TouchableOpacity>
                    <View style={styles.kv}>
                      <Text style={styles.k}>Violations so far</Text>
                      <StrikeDots count={author.violations} />
                    </View>
                  </>
                ) : (
                  <View style={styles.kv}><Text style={styles.k}>Author</Text><Text style={styles.v}>No owner account</Text></View>
                )}
                {!!data.context && (
                  <View style={[styles.kv, styles.last]}>
                    <Text style={styles.k}>{data.targetType === 'comment' ? 'On post' : 'Artist'}</Text>
                    <Text style={styles.v} numberOfLines={1}>{data.context}</Text>
                  </View>
                )}
              </View>

              {data.removed && <NoticeBox tone="ok" style={styles.mt10}>This {word} was removed.</NoticeBox>}
              {!data.removed && data.status === 'resolved' && <NoticeBox tone="info" style={styles.mt10}>Reports were dismissed – the {word} stays visible.</NoticeBox>}
              {open && data.willLock && (
                <View style={styles.badBox}>
                  <Text style={styles.badText}>
                    <Text style={styles.bold}>Removing this {word} is violation #{author.violations + 1}.</Text> {author.name}'s account will be locked permanently and all their content hidden.
                  </Text>
                </View>
              )}

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Reports</Text>
                {data.reports.map((r: any, i: number) => (
                  <View key={r.id} style={[styles.rRow, i === data.reports.length - 1 && styles.last]}>
                    <NameAvatar name={r.reporterName} size={32} />
                    <View style={styles.flex}>
                      <Text style={styles.rTitle}>{r.reporterName} · {r.reasonLabel}</Text>
                      <Text style={styles.sub} numberOfLines={2}>{r.details ? `"${r.details}" · ` : ''}{timeAgoText(r.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )
        )}
      </ScrollView>
      {open && (
        <View style={styles.footer}>
          <AppButton
            label={data.willLock ? `Remove ${word} & lock account` : `Remove ${word}`}
            variant="danger"
            onPress={() => setRemoveOpen(true)}
          />
          <AppButton label="Dismiss reports" variant="outline" onPress={() => setDismissOpen(true)} style={styles.mt8} />
        </View>
      )}

      <RuleSheet
        visible={removeOpen}
        title={`Remove this ${word}?`}
        message={
          author
            ? `It disappears for everyone. ${author.name} gets a notification and this counts as 1 violation (${author.violations}/${max} → ${author.violations + 1}).`
            : 'It disappears for everyone. There is no owner account, so no violation is recorded.'
        }
        warning={data?.willLock ? `This is the 4th violation: ${author?.name}'s account will be locked permanently.` : null}
        confirmLabel={data?.willLock ? 'Remove & lock account' : 'Remove'}
        onClose={() => setRemoveOpen(false)}
        onConfirm={remove}
      />

      <ConfirmDialog
        visible={dismissOpen}
        title="Dismiss these reports?"
        message={`The ${word} stays visible and no violation is recorded.`}
        onClose={() => setDismissOpen(false)}
      >
        <View style={styles.dialogRow}>
          <AppButton label="Cancel" variant="outline" onPress={() => setDismissOpen(false)} style={styles.flex} />
          <AppButton label="Dismiss" onPress={dismiss} loading={busy} style={styles.flex} />
        </View>
      </ConfirmDialog>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 60 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mb10: { marginBottom: 10 },
  flex: { flex: 1, minWidth: 0 },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  quote: { backgroundColor: COLORS.tagBg, borderRadius: 12, padding: 11, fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 19, marginVertical: 10 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  last: { borderBottomWidth: 0 },
  k: { fontSize: 13, color: COLORS.textSecondary },
  v: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1, textAlign: 'right' },
  linkText: { color: COLORS.primaryDark },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  badBox: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 12, padding: 11, marginTop: 10 },
  badText: { fontSize: 12.5, color: '#9F1239', lineHeight: 18 },
  bold: { fontWeight: '800' },
  rRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  dialogRow: { flexDirection: 'row', gap: 10 },
});
