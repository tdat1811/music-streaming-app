import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { timeAgoText } from '../../src/utils/time';
import { formatCount } from '../../src/utils/plays';
import { targetLabel } from '../../src/utils/moderation';
import { AppButton, Badge, BadgeTone, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell, AdminTab } from '../../src/components/AdminShell';
import { StrikeDots } from '../../src/components/ModerationUi';

export type ManageSegment = 'users' | 'artists' | 'reports';

const FILTERS: Record<ManageSegment, { id: string; label: string }[]> = {
  users: [
    { id: 'all', label: 'All' },
    { id: 'listener', label: 'Listeners' },
    { id: 'artist', label: 'Artists' },
    { id: 'admin', label: 'Admins' },
    { id: 'locked', label: 'Locked' },
    { id: 'violations', label: 'Has violations' },
  ],
  artists: [
    { id: 'all', label: 'All' },
    { id: 'verified', label: 'Verified' },
    { id: 'unverified', label: 'Not verified' },
    { id: 'hidden', label: 'Hidden' },
  ],
  reports: [
    { id: 'open', label: 'Open' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'song', label: 'Songs' },
    { id: 'post', label: 'Posts' },
    { id: 'comment', label: 'Comments' },
  ],
};
const SEARCH_DELAY_MS = 300;
const ROLE_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  listener: { label: 'Listener', tone: 'grey' },
  artist: { label: 'Artist', tone: 'artist' },
  admin: { label: 'Admin', tone: 'admin' },
};
const REPORT_TONE: Record<string, BadgeTone> = { song: 'bad', post: 'artist', comment: 'pending' };

interface AdminManageScreenProps {
  segment: ManageSegment;
  onSegmentChange?: (s: ManageSegment) => void;
  onTabPress?: (tab: AdminTab) => void;
  onOpenUser?: (id: string) => void;
  onOpenArtist?: (id: string) => void;
  onOpenReport?: (type: string, id: string) => void;
}

// G1–G3: tab Manage – chọn Users / Artists / Reports ở thanh trên, mỗi loại có bộ lọc riêng
export const AdminManageScreen: React.FC<AdminManageScreenProps> = ({ segment, onSegmentChange, onTabPress, onOpenUser, onOpenArtist, onOpenReport }) => {
  const [filter, setFilter] = useState(FILTERS[segment][0].id);
  // Báo cáo: Open / Resolved và loại nội dung là 2 lựa chọn độc lập
  const [reportType, setReportType] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  // Loại của dữ liệu đang giữ (tránh vẽ dữ liệu báo cáo bằng dòng Users / Artists khi vừa đổi loại)
  const [itemsSegment, setItemsSegment] = useState<ManageSegment>(segment);
  const [segments, setSegments] = useState<{ users?: number; artists?: number; reports?: number }>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  // Đổi loại: về bộ lọc đầu tiên
  useEffect(() => {
    setFilter(FILTERS[segment][0].id);
    setReportType(null);
    setQuery('');
    setItems([]);
  }, [segment]);

  const load = useCallback(
    async (mode: 'replace' | 'append' | 'refresh', nextPage = 1) => {
      const seq = ++seqRef.current;
      if (mode === 'replace') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'append') setLoadingMore(true);
      setError(null);
      try {
        const q = query.trim();
        const res =
          segment === 'users'
            ? await api.admin.listUsers({ q, filter, page: nextPage })
            : segment === 'artists'
              ? await api.admin.listArtists({ q, filter, page: nextPage })
              : await api.admin.listReports({ status: filter === 'resolved' ? 'resolved' : 'open', type: reportType ?? undefined });
        if (seq !== seqRef.current) return;
        setItems((prev) => (mode === 'append' ? [...prev, ...res.data] : res.data));
        setItemsSegment(segment);
        setSegments(res.segments ?? {});
        setTotal(res.total ?? res.data.length);
        setPage(nextPage);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [segment, filter, reportType, query]
  );

  useEffect(() => {
    const timer = setTimeout(() => load('replace'), query ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const pickFilter = (id: string) => {
    if (segment === 'reports' && ['song', 'post', 'comment'].includes(id)) {
      setReportType(reportType === id ? null : id);
      return;
    }
    setFilter(id);
  };
  const chipOn = (id: string) => (segment === 'reports' && ['song', 'post', 'comment'].includes(id) ? reportType === id : filter === id);

  const renderUser = ({ item }: { item: any }) => {
    const role = ROLE_BADGE[item.role] ?? ROLE_BADGE.listener;
    return (
      <TouchableOpacity style={styles.row} onPress={() => onOpenUser?.(item.id)} activeOpacity={0.7} accessibilityLabel={`Open user ${item.name}`}>
        <NameAvatar name={item.name} size={40} />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>{item.name}{item.isSelf ? ' (you)' : ''}</Text>
          <View style={styles.subRow}>
            <Text style={styles.sub} numberOfLines={1}>{item.email}</Text>
            {item.violations > 0 && <StrikeDots count={item.violations} />}
          </View>
        </View>
        {item.lock ? <Badge label="Locked" tone="lock" /> : <Badge label={role.label} tone={role.tone} />}
      </TouchableOpacity>
    );
  };

  const renderArtist = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.row} onPress={() => onOpenArtist?.(item.id)} activeOpacity={0.7} accessibilityLabel={`Open artist ${item.name}`}>
      <NameAvatar name={item.name} image={item.avatarImage} size={40} />
      <View style={styles.rowText}>
        <View style={styles.subRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.isVerified && <Ionicons name="checkmark-circle" size={14} color="#00A3FF" />}
        </View>
        <View style={styles.subRow}>
          <Text style={styles.sub} numberOfLines={1}>
            {formatCount(item.followers)} followers · {item.songs} songs{item.hasOwner ? '' : ' · no owner'}
          </Text>
          {item.ownerViolations > 0 && <StrikeDots count={item.ownerViolations} />}
        </View>
      </View>
      {item.hidden || item.ownerLocked ? (
        <Badge label={item.ownerLocked ? 'Owner locked' : 'Hidden'} tone="bad" />
      ) : !item.isVerified ? (
        <Badge label="Not verified" tone="grey" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );

  const renderReport = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onOpenReport?.(item.targetType, item.targetId)}
      activeOpacity={0.7}
      accessibilityLabel={`Open report ${item.snapshot}`}
    >
      <Badge label={targetLabel(item.targetType)} tone={REPORT_TONE[item.targetType] ?? 'grey'} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>{item.targetType === 'song' ? item.snapshot : `"${item.snapshot}"`}</Text>
        <View style={styles.subRow}>
          {!!item.author && <Text style={styles.sub} numberOfLines={1}>{item.author.name}</Text>}
          {!!item.author && <StrikeDots count={item.author.violations} showText={false} />}
          <Text style={styles.sub} numberOfLines={1}>
            · {item.reasonLabel} · {item.count} report{item.count === 1 ? '' : 's'}
            {item.outcome ? ` · ${item.outcome}` : ` · ${timeAgoText(item.latestAt)}`}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const SEGMENTS: { id: ManageSegment; label: string }[] = [
    { id: 'users', label: `Users${segments.users !== undefined ? ` (${segments.users})` : ''}` },
    { id: 'artists', label: `Artists${segments.artists !== undefined ? ` (${segments.artists})` : ''}` },
    { id: 'reports', label: `Reports${segments.reports !== undefined ? ` (${segments.reports})` : ''}` },
  ];

  return (
    <AdminShell
      title="Manage"
      subtitle="Users, artists and reports"
      icon="people-outline"
      activeTab="manage"
      onTabPress={onTabPress}
      reportCount={segments.reports ?? 0}
    >
      <View style={styles.top}>
        <View style={styles.seg}>
          {SEGMENTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.segItem, segment === s.id && styles.segOn]}
              onPress={() => onSegmentChange?.(s.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: segment === s.id }}
              accessibilityLabel={`Manage ${s.id}`}
            >
              <Text style={[styles.segText, segment === s.id && styles.segTextOn]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {segment !== 'reports' && (
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={segment === 'users' ? 'Search name or email' : 'Search artist name'}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={segment === 'users' ? 'Search users' : 'Search artists'}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS[segment].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, chipOn(f.id) && styles.chipOn]}
              onPress={() => pickFilter(f.id)}
              accessibilityLabel={`Filter ${f.label}`}
              accessibilityState={{ selected: chipOn(f.id) }}
            >
              <Text style={[styles.chipText, chipOn(f.id) && styles.chipTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : error ? (
        <View style={styles.pad}>
          <NoticeBox tone="error">{error}</NoticeBox>
          <AppButton label="Try again" variant="outline" onPress={() => load('replace')} style={styles.mt12} />
        </View>
      ) : (
        <FlatList
          data={itemsSegment === segment ? items : []}
          keyExtractor={(item) => (segment === 'reports' ? `${item.targetType}:${item.targetId}` : item.id)}
          renderItem={segment === 'users' ? renderUser : segment === 'artists' ? renderArtist : renderReport}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {segment === 'reports' ? (filter === 'resolved' ? 'No resolved reports.' : 'No open reports. 🎉') : query ? 'Nothing matches your search.' : 'Nothing here.'}
            </Text>
          }
          ListFooterComponent={
            segment !== 'reports' && items.length < total ? (
              <AppButton label="Load more" variant="outline" loading={loadingMore} onPress={() => load('append', page + 1)} style={styles.mt12} />
            ) : segment === 'reports' && items.length > 0 && filter !== 'resolved' ? (
              <Text style={styles.hint}>Most-reported first · dots show the author's violations</Text>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 14 },
  seg: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 4, marginBottom: 10 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segOn: { backgroundColor: '#15161B' },
  segText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: '#FFFFFF' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 42, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary, paddingVertical: 0 },
  chips: { gap: 6, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  chipOn: { backgroundColor: '#15161B', borderColor: '#15161B' },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextOn: { color: '#FFFFFF' },
  loader: { marginTop: 40 },
  pad: { padding: 20 },
  mt12: { marginTop: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sub: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
  hint: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11.5, marginTop: 14 },
});
