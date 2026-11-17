import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { ArtistRequestData } from '../../src/utils/artistRequest';
import { timeAgoText } from '../../src/utils/time';
import { AppButton, Badge, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell, AdminTab } from '../../src/components/AdminShell';
import { actionSubtitle, actionTitle, actionUi, targetLabel } from '../../src/utils/moderation';

interface Summary {
  pendingRequests: number;
  artists: number;
  users: number;
  songs: number;
  thisWeek: { artists: number; users: number; songs: number };
  oldestPendingAt: string | null;
  pendingPreview: ArtistRequestData[];
  recentlyReviewed: (ArtistRequestData & { reviewerName?: string })[];
  // Giai đoạn 5
  openReports: number;
  openReportsByType: { song: number; post: number; comment: number };
  reportsPreview: { targetType: string; targetId: string; count: number; latestAt: string; reasonLabel: string; snapshot: string }[];
  violations: number;
  violationsThisWeek: number;
  lockedUsers: number;
  usersAtLimit: number;
  recentActions: { id: string; action: string; targetType: string; targetLabel: string; ruleLabel: string; note: string; adminName: string; createdAt: string }[];
}

interface AdminDashboardScreenProps {
  onTabPress?: (tab: AdminTab) => void;
  onOpenRequest?: (requestId: string) => void;
  onOpenReport?: (type: string, id: string) => void;
  onSeeReports?: () => void;
}

// A1: trang chính của khu Admin – số liệu, yêu cầu cần xử lý, hoạt động gần đây
export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onTabPress, onOpenRequest, onOpenReport, onSeeReports }) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.admin.getSummary();
      setData(res.data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reportTypes = data
    ? (['song', 'post', 'comment'] as const)
        .filter((t) => data.openReportsByType?.[t])
        .map((t) => `${data.openReportsByType[t]} ${targetLabel(t).toLowerCase()}${data.openReportsByType[t] === 1 ? '' : 's'}`)
        .join(' · ')
    : '';
  const kpis = data
    ? [
        { l: 'Pending requests', n: data.pendingRequests, d: data.oldestPendingAt ? `Oldest: ${timeAgoText(data.oldestPendingAt)}` : 'All caught up', color: data.pendingRequests ? '#D97706' : undefined, grey: true },
        { l: 'Open reports', n: data.openReports, d: reportTypes || 'Nothing to review', color: data.openReports ? '#E11D48' : undefined, grey: true, alert: data.openReports > 0 },
        { l: 'Users', n: data.users, d: `${data.lockedUsers} locked · ${data.usersAtLimit} at 3/3`, grey: true },
        { l: 'Violations', n: data.violations, d: `+${data.violationsThisWeek} this week` },
      ]
    : [];
  // Hoạt động gần đây: thao tác kiểm duyệt + duyệt / từ chối nghệ sĩ, mới nhất trước
  const activity = data
    ? [
        ...data.recentActions.map((a) => {
          const ui = actionUi(a.action);
          return { key: a.id, at: a.createdAt, label: ui.label, tone: ui.tone, title: actionTitle(a), sub: actionSubtitle(a) };
        }),
        ...data.recentlyReviewed.map((r) => ({
          key: r.id,
          at: r.reviewedAt as string,
          label: r.status === 'approved' ? 'Approved' : 'Rejected',
          tone: (r.status === 'approved' ? 'ok' : 'bad') as any,
          title: r.stageName,
          sub: [r.status === 'rejected' && r.rejectReasonText, r.reviewerName && `by ${r.reviewerName}`].filter(Boolean).join(' · '),
        })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 6)
    : [];

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`MusicStream Admin · ${currentUser?.name ?? ''}`}
      activeTab="dashboard"
      onTabPress={onTabPress}
      pendingCount={data?.pendingRequests ?? 0}
      reportCount={data?.openReports ?? 0}
      right={
        <TouchableOpacity onPress={() => load(true)} accessibilityLabel="Refresh dashboard" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
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
              <View style={styles.kpis}>
                {kpis.map((k) => (
                  <View key={k.l} style={[styles.kpi, k.alert && styles.kpiAlert]}>
                    <Text style={styles.kpiL}>{k.l}</Text>
                    <Text style={[styles.kpiN, !!k.color && { color: k.color }]}>{k.n}</Text>
                    <Text style={[styles.kpiD, k.grey && { color: COLORS.textSecondary }]} numberOfLines={1}>{k.d}</Text>
                  </View>
                ))}
              </View>

              {data.openReports > 0 && (
                <View style={styles.panel}>
                  <View style={styles.panelHead}>
                    <Text style={styles.panelTitle}>Reports to review</Text>
                    <TouchableOpacity onPress={onSeeReports} accessibilityLabel="See all reports">
                      <Text style={styles.link}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  {data.reportsPreview.map((r, i) => (
                    <TouchableOpacity
                      key={`${r.targetType}:${r.targetId}`}
                      style={[styles.item, i === data.reportsPreview.length - 1 && styles.itemLast]}
                      onPress={() => onOpenReport?.(r.targetType, r.targetId)}
                      accessibilityLabel={`Review report ${r.snapshot}`}
                    >
                      <Badge label={targetLabel(r.targetType)} tone={r.targetType === 'song' ? 'bad' : r.targetType === 'post' ? 'artist' : 'pending'} />
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{r.targetType === 'song' ? r.snapshot : `"${r.snapshot}"`}</Text>
                        <Text style={styles.itemSub} numberOfLines={1}>{r.reasonLabel} · {r.count} report{r.count === 1 ? '' : 's'} · {timeAgoText(r.latestAt)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.panel}>
                <View style={styles.panelHead}>
                  <Text style={styles.panelTitle}>Needs your review</Text>
                  {data.pendingRequests > 0 && (
                    <TouchableOpacity onPress={() => onTabPress?.('requests')} accessibilityLabel="See all requests">
                      <Text style={styles.link}>See all</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {data.pendingPreview.length === 0 ? (
                  <Text style={styles.empty}>No requests waiting. 🎉</Text>
                ) : (
                  data.pendingPreview.map((r, i) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.item, i === data.pendingPreview.length - 1 && styles.itemLast]}
                      onPress={() => onOpenRequest?.(r.id)}
                      accessibilityLabel={`Review ${r.stageName}`}
                    >
                      <NameAvatar name={r.stageName} image={r.avatarImage} size={34} />
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{r.stageName}</Text>
                        <Text style={styles.itemSub}>{r.genres.join(' · ')} · {timeAgoText(r.createdAt)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Recent activity</Text>
                {activity.length === 0 ? (
                  <Text style={styles.empty}>Nothing reviewed yet.</Text>
                ) : (
                  activity.map((a, i) => (
                    <View key={a.key} style={[styles.item, i === activity.length - 1 && styles.itemLast]}>
                      <Badge label={a.label} tone={a.tone} />
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.itemSub} numberOfLines={1}>{[a.sub, timeAgoText(a.at)].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )
        )}
      </ScrollView>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  loader: { marginTop: 60 },
  mt12: { marginTop: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48%', flexGrow: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
  kpiL: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  kpiN: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  kpiAlert: { borderColor: '#FECDD3' },
  kpiD: { fontSize: 11, fontWeight: '700', color: '#16A34A', marginTop: 2 },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 12.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  itemLast: { borderBottomWidth: 0 },
  itemText: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  itemSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 },
  empty: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 8 },
});
