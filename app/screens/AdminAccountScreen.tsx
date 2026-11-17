import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { AppButton, Badge, NameAvatar } from '../../src/components/ArtistUi';
import { ConfirmDialog } from '../../src/components/StudioUi';
import { AdminShell, AdminTab } from '../../src/components/AdminShell';

interface AdminAccountScreenProps {
  onTabPress?: (tab: AdminTab) => void;
  onEditInfo?: () => void;
  onChangePassword?: () => void;
  onOpenHistory?: () => void;
  onLogout?: () => void;
}

// A6: tab Account của khu Admin – thông tin tài khoản, đổi mật khẩu, lịch sử duyệt, đăng xuất
export const AdminAccountScreen: React.FC<AdminAccountScreenProps> = ({ onTabPress, onEditInfo, onChangePassword, onOpenHistory, onLogout }) => {
  const { currentUser } = useAuth();
  const [counts, setCounts] = useState<{ approved: number; rejected: number } | null>(null);
  const [pending, setPending] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    api.admin.getMyReviews().then((res) => setCounts(res.counts)).catch(() => {});
    api.admin.getSummary().then((res) => setPending(res.data?.pendingRequests ?? 0)).catch(() => {});
  }, []);

  const items: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; onPress?: () => void }[] = [
    { icon: 'person-outline', title: 'Edit name & email', onPress: onEditInfo },
    { icon: 'lock-closed-outline', title: 'Change password', onPress: onChangePassword },
    {
      icon: 'time-outline',
      title: 'My review history',
      sub: counts ? `${counts.approved} approved · ${counts.rejected} rejected` : undefined,
      onPress: onOpenHistory,
    },
  ];

  return (
    <AdminShell title="Account" subtitle="Admin account settings" icon="person-outline" activeTab="account" onTabPress={onTabPress} pendingCount={pending}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, styles.center]}>
          <NameAvatar name={currentUser?.name ?? 'Admin'} size={64} />
          <Text style={styles.name}>{currentUser?.name}</Text>
          <Text style={styles.email}>{currentUser?.email}</Text>
          <View style={styles.mt6}><Badge label="Admin" tone="admin" icon="shield-checkmark" /></View>
        </View>

        <View style={styles.panel}>
          {items.map((it, i) => (
            <TouchableOpacity key={it.title} style={[styles.item, i === items.length - 1 && styles.itemLast]} onPress={it.onPress} accessibilityLabel={it.title}>
              <Ionicons name={it.icon} size={18} color={COLORS.textPrimary} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{it.title}</Text>
                {!!it.sub && <Text style={styles.itemSub}>{it.sub}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.panel}>
          <TouchableOpacity style={[styles.item, styles.itemLast]} onPress={() => setConfirmLogout(true)} accessibilityLabel="Log out">
            <Ionicons name="log-out-outline" size={18} color="#E11D48" />
            <Text style={[styles.itemTitle, { color: '#E11D48' }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmDialog visible={confirmLogout} title="Log out?" message="You will return to the welcome screen." onClose={() => setConfirmLogout(false)}>
        <AppButton
          label="Log out"
          variant="danger"
          onPress={() => {
            setConfirmLogout(false);
            onLogout?.();
          }}
        />
        <AppButton label="Cancel" variant="ghost" onPress={() => setConfirmLogout(false)} />
      </ConfirmDialog>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12 },
  center: { alignItems: 'center', paddingVertical: 18 },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  mt6: { marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  itemLast: { borderBottomWidth: 0 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
