import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { AppButton, Badge, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { formatDateTime } from '../../src/utils/time';
import { formatUsd, paymentBadge, paymentLabel } from '../../src/utils/insights';

interface PaymentHistoryScreenProps {
  onBack?: () => void;
}

// Lịch sử thanh toán (giai đoạn 6): gói VIP, lượt AI Fan Insight cũ và gói 20 tin AI Assistant (6b) – thanh toán giả lập
export const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.payments.list();
      setItems(res.data || []);
      setTotal(res.total || 0);
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

  const renderItem = ({ item }: { item: any }) => {
    const l = paymentLabel(item.type);
    const badge = paymentBadge(item);
    return (
      <View style={styles.row} accessibilityLabel={`${item.description} ${formatUsd(item.amount)}`}>
        <View style={[styles.icon, item.type === 'vip' ? styles.iconVip : styles.iconAi]}>
          <Ionicons name={l.icon} size={18} color={item.type === 'vip' ? '#D97706' : '#7B2CBF'} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{item.description || l.title}</Text>
          <Text style={styles.sub}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatUsd(item.amount)}</Text>
          {!!badge && <Badge label={badge.label} tone={badge.tone} />}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Payment history" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : error ? (
        <View style={styles.pad}>
          <NoticeBox tone="error">{error}</NoticeBox>
          <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            items.length ? (
              <View style={styles.summary}>
                <Text style={styles.summaryL}>Total spent</Text>
                <Text style={styles.summaryN}>{formatUsd(total)}</Text>
                <Text style={styles.summaryNote}>Demo payments – no real money is charged.</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No payments yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { marginTop: 60 },
  pad: { padding: 20 },
  mt12: { marginTop: 12 },
  flex: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  summary: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 8 },
  summaryL: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  summaryN: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  summaryNote: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconVip: { backgroundColor: '#FEF3C7' },
  iconAi: { backgroundColor: '#F3E8FF' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
