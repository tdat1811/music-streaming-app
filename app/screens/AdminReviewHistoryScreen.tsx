import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { ArtistRequestData } from '../../src/utils/artistRequest';
import { formatDateTime } from '../../src/utils/time';
import { Badge, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';

interface AdminReviewHistoryScreenProps {
  onBack?: () => void;
  onOpenRequest?: (requestId: string) => void;
}

// Lịch sử duyệt / từ chối của chính admin đang đăng nhập (mở từ tab Account)
export const AdminReviewHistoryScreen: React.FC<AdminReviewHistoryScreenProps> = ({ onBack, onOpenRequest }) => {
  const [items, setItems] = useState<ArtistRequestData[]>([]);
  const [counts, setCounts] = useState({ approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .getMyReviews()
      .then((res) => {
        setItems(res.data ?? []);
        setCounts(res.counts ?? { approved: 0, rejected: 0 });
      })
      .catch((err) => setError(isApiError(err) ? err.message : "Can't connect to the server."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="My review history" subtitle={`${counts.approved} approved · ${counts.rejected} rejected`} onBack={onBack}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : error ? (
        <View style={styles.pad}><NoticeBox tone="error">{error}</NoticeBox></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>You haven't reviewed any requests yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => onOpenRequest?.(item.id)} accessibilityLabel={`Open ${item.stageName}`}>
              <NameAvatar name={item.stageName} image={item.avatarImage} size={40} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.stageName}</Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {formatDateTime(item.reviewedAt)}{item.status === 'rejected' && item.rejectReasonText ? ` · ${item.rejectReasonText}` : ''}
                </Text>
              </View>
              <Badge label={item.status === 'approved' ? 'Approved' : 'Rejected'} tone={item.status === 'approved' ? 'ok' : 'bad'} />
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  pad: { padding: 16 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 8 },
  itemText: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
