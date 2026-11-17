import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { AppButton, Badge, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { BottomSheet } from '../../src/components/StudioUi';
import { formatDateTime } from '../../src/utils/time';
import { formatMoney, paymentBadge, paymentLabel } from '../../src/utils/insights';

interface PaymentHistoryScreenProps {
  onBack?: () => void;
}

const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
const TOP_UP_AMOUNTS = [50000, 100000, 200000];

// Ví & lịch sử thanh toán: số dư (VNĐ), nạp tiền qua MoMo (giả lập), gói VIP, gói 20 tin AI Assistant,
// lượt AI Fan Insight cũ (USD, giai đoạn 6). Mọi khoản mua đều trừ vào số dư ví.
export const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ onBack }) => {
  const { reloadAccount } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Bảng nạp tiền
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState(TOP_UP_AMOUNTS[1]);
  const [phone, setPhone] = useState('');
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.payments.list();
      setItems(res.data || []);
      setTotal(res.total || 0);
      setBalance(res.balance || 0);
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const topUp = async () => {
    setTopUpError(null);
    if (phone.replace(/\D/g, '').length < 9) {
      setTopUpError('Please enter your MoMo phone number.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.auth.depositMoMo(amount, phone.trim());
      setTopUpOpen(false);
      setNotice(`Topped up ${formatMoney(amount)}. New balance: ${formatMoney(res.data?.balance ?? balance + amount)}.`);
      await Promise.all([load(), reloadAccount()]);
    } catch (err) {
      setTopUpError(errText(err));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const l = paymentLabel(item.type);
    const badge = paymentBadge(item);
    const incoming = item.direction > 0;
    const money = `${incoming ? '+' : '−'}${formatMoney(item.amount, item.currency)}`;
    return (
      <View style={styles.row} accessibilityLabel={`${item.description} ${money}`}>
        <View style={[styles.icon, item.type === 'vip' ? styles.iconVip : incoming ? styles.iconIn : item.type === 'withdraw' ? styles.iconOut : styles.iconAi]}>
          <Ionicons name={l.icon} size={18} color={item.type === 'vip' ? '#D97706' : incoming ? '#16A34A' : item.type === 'withdraw' ? '#E11D48' : '#7B2CBF'} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{item.description || l.title}</Text>
          <Text style={styles.sub}>
            {formatDateTime(item.createdAt)}
            {item.balanceAfter !== null && item.balanceAfter !== undefined ? ` · Balance ${formatMoney(item.balanceAfter)}` : ''}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, incoming && styles.amountIn]}>{money}</Text>
          {!!badge && <Badge label={badge.label} tone={badge.tone} />}
        </View>
      </View>
    );
  };

  const header = (
    <View>
      <View style={styles.wallet}>
        <Text style={styles.walletL}>Wallet balance</Text>
        <Text style={styles.walletN} accessibilityLabel={`Wallet balance ${formatMoney(balance)}`}>{formatMoney(balance)}</Text>
        <AppButton
          label="Top up via MoMo"
          onPress={() => {
            setTopUpError(null);
            setTopUpOpen(true);
          }}
          style={styles.topUpBtn}
        />
        <Text style={styles.walletNote}>VIP plans and AI Assistant messages are paid from this balance. Demo wallet – no real money is charged.</Text>
      </View>
      {!!notice && <NoticeBox tone="ok" style={styles.mb8}>{notice}</NoticeBox>}
      {items.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryL}>Total spent</Text>
          <Text style={styles.summaryN}>{formatMoney(total)}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Wallet & payments" onBack={onBack} />
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
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No payments yet.</Text>
            </View>
          }
        />
      )}

      {/* Nạp tiền qua MoMo (giả lập) */}
      <BottomSheet visible={topUpOpen} onClose={() => !saving && setTopUpOpen(false)}>
        <Text style={styles.sheetTitle}>Top up via MoMo</Text>
        <Text style={styles.sheetSub}>Choose an amount</Text>
        <View style={styles.amounts}>
          {TOP_UP_AMOUNTS.map((a) => (
            <TouchableOpacity key={a} style={[styles.amountChip, amount === a && styles.amountChipOn]} onPress={() => setAmount(a)} accessibilityLabel={`Top up ${formatMoney(a)}`}>
              <Text style={[styles.amountChipText, amount === a && styles.amountChipTextOn]}>{formatMoney(a)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sheetSub}>MoMo phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="09xx xxx xxx"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          maxLength={15}
          accessibilityLabel="MoMo phone number"
        />
        {!!topUpError && <NoticeBox tone="error" style={styles.mt8}>{topUpError}</NoticeBox>}
        <Text style={styles.walletNoteDark}>Demo top-up – nothing is charged from your MoMo account.</Text>
        <AppButton label={`Top up ${formatMoney(amount)}`} onPress={topUp} loading={saving} style={styles.mt12} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setTopUpOpen(false)} disabled={saving} />
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { marginTop: 60 },
  pad: { padding: 20 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mb8: { marginBottom: 8 },
  flex: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  wallet: { backgroundColor: '#6B3FC4', borderRadius: 16, padding: 16, marginBottom: 10 },
  walletL: { fontSize: 12.5, fontWeight: '700', color: '#E9D5FF' },
  walletN: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  topUpBtn: { backgroundColor: '#A50064', marginTop: 12 },
  walletNote: { fontSize: 11.5, color: '#E9D5FF', marginTop: 8, lineHeight: 16 },
  walletNoteDark: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 10 },
  summary: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 8 },
  summaryL: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  summaryN: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconVip: { backgroundColor: '#FEF3C7' },
  iconAi: { backgroundColor: '#F3E8FF' },
  iconIn: { backgroundColor: '#DCFCE7' },
  iconOut: { backgroundColor: '#FFE4E6' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary },
  amountIn: { color: '#16A34A' },
  empty: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  sheetSub: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 10, marginBottom: 6 },
  amounts: { flexDirection: 'row', gap: 8 },
  amountChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  amountChipOn: { borderColor: '#A50064', backgroundColor: '#FDF2F8' },
  amountChipText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  amountChipTextOn: { color: '#A50064' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
});
