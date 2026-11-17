import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { ArtistRequestData } from '../../src/utils/artistRequest';
import { timeAgoText } from '../../src/utils/time';
import { AppButton, Badge, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell, AdminTab } from '../../src/components/AdminShell';

type Tab = 'pending' | 'approved' | 'rejected';
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];
const SEARCH_DELAY_MS = 300;

interface AdminRequestsScreenProps {
  // Tab chính của khu Admin
  onTabPress?: (tab: AdminTab) => void;
  onOpenRequest?: (requestId: string) => void;
}

// B3: danh sách yêu cầu nghệ sĩ theo trạng thái, có tìm kiếm và "Load more"
export const AdminRequestsScreen: React.FC<AdminRequestsScreenProps> = ({ onTabPress, onOpenRequest }) => {
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArtistRequestData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bỏ kết quả của lần tải cũ khi người dùng đổi tab / gõ tiếp
  const requestSeq = useRef(0);

  const load = useCallback(async (opts: { tab: Tab; q: string; page: number; mode: 'replace' | 'append' | 'refresh' }) => {
    const seq = ++requestSeq.current;
    if (opts.mode === 'replace') setLoading(true);
    if (opts.mode === 'refresh') setRefreshing(true);
    if (opts.mode === 'append') setLoadingMore(true);
    setError(null);
    try {
      const res = await api.admin.listRequests({ status: opts.tab, q: opts.q, page: opts.page });
      if (seq !== requestSeq.current) return;
      setItems((prev) => (opts.mode === 'append' ? [...prev, ...res.data] : res.data));
      setCounts(res.counts ?? {});
      setTotal(res.total ?? 0);
      setPage(opts.page);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Đổi tab: tải ngay; gõ tìm kiếm: chờ người dùng ngừng gõ một chút
  useEffect(() => {
    const timer = setTimeout(() => load({ tab, q: query.trim(), page: 1, mode: 'replace' }), query ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [tab, query, load]);

  const renderItem = ({ item }: { item: ArtistRequestData }) => {
    const links = item.socialLinks?.length ?? 0;
    const when = tab === 'pending' ? item.createdAt : item.reviewedAt;
    return (
      <TouchableOpacity style={styles.row} onPress={() => onOpenRequest?.(item.id)} activeOpacity={0.7} accessibilityLabel={`Open request ${item.stageName}`}>
        <NameAvatar name={item.stageName} image={item.avatarImage} size={48} />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>{item.stageName}</Text>
          <Text style={styles.sub} numberOfLines={1}>{item.applicant?.email ?? 'Unknown user'} · {timeAgoText(when)}</Text>
          <View style={styles.badges}>
            <Badge label={item.genres.join(' · ')} tone="grey" />
            <Badge label={links ? `${links} link${links > 1 ? 's' : ''}` : 'No links'} tone={links ? 'artist' : 'grey'} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <AdminShell
      title="Artist requests"
      subtitle={counts.pending !== undefined ? `${counts.pending} waiting for review` : 'Approve or reject new artists'}
      icon="mic-outline"
      activeTab="requests"
      onTabPress={onTabPress}
      pendingCount={counts.pending ?? 0}
    >
      <View style={styles.top}>
        <View style={styles.seg}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.segItem, tab === t.id && styles.segOn]} onPress={() => setTab(t.id)} accessibilityState={{ selected: tab === t.id }}>
              <Text style={[styles.segText, tab === t.id && styles.segTextOn]}>
                {t.label}{counts[t.id] !== undefined ? ` (${counts[t.id]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search stage name or email"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search requests"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : error ? (
        <View style={styles.pad}>
          <NoticeBox tone="error">{error}</NoticeBox>
          <AppButton label="Try again" variant="outline" onPress={() => load({ tab, q: query.trim(), page: 1, mode: 'replace' })} style={styles.mt12} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ tab, q: query.trim(), page: 1, mode: 'refresh' })} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{query ? 'No requests match your search.' : `No ${tab} requests.`}</Text>
          }
          ListFooterComponent={
            items.length < total ? (
              <AppButton
                label="Load more"
                variant="outline"
                loading={loadingMore}
                onPress={() => load({ tab, q: query.trim(), page: page + 1, mode: 'append' })}
                style={styles.mt12}
              />
            ) : items.length > 0 ? (
              <Text style={styles.hint}>{tab === 'pending' ? 'Oldest first · pull down to refresh' : 'Newest first · pull down to refresh'}</Text>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  top: { paddingHorizontal: 16, paddingTop: 14 },
  seg: { flexDirection: 'row', backgroundColor: COLORS.tagBg, borderRadius: 12, padding: 4, marginBottom: 12 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.textPrimary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, height: 42, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary, paddingVertical: 0 },
  loader: { marginTop: 40 },
  pad: { padding: 20 },
  mt12: { marginTop: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
  hint: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11.5, marginTop: 14 },
});
