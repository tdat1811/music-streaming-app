import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Khung chung của khu Admin riêng: thanh trên màu tối + thanh tab riêng (Dashboard · Requests · Manage · Account).
// Khu Admin không có phần nghe nhạc (không tab nghe nhạc, không mini player).

export const ADMIN_COLORS = {
  ink: '#15161B',
  inkText: '#FFFFFF',
  inkMuted: '#A3A8B5',
  tabInactive: '#8B90A0',
  background: '#F6F7F9',
};

export type AdminTab = 'dashboard' | 'requests' | 'manage' | 'account';

const TABS: { id: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { id: 'requests', label: 'Requests', icon: 'mic-outline' },
  { id: 'manage', label: 'Manage', icon: 'people-outline' },
  { id: 'account', label: 'Account', icon: 'person-outline' },
];

interface AdminShellProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  // Màn con (VD chi tiết yêu cầu): có nút quay lại, ẩn thanh tab
  onBack?: () => void;
  right?: React.ReactNode;
  // Màn chính: hiện thanh tab, tab đang chọn
  activeTab?: AdminTab;
  onTabPress?: (tab: AdminTab) => void;
  // Số yêu cầu đang chờ (chấm đỏ trên tab Requests)
  pendingCount?: number;
  // Số nội dung bị báo cáo đang chờ xử lý (chấm đỏ trên tab Manage)
  reportCount?: number;
  // Nền trắng cho màn chi tiết; mặc định xám nhạt
  white?: boolean;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  title,
  subtitle,
  icon = 'shield-checkmark-outline',
  onBack,
  right,
  activeTab,
  onTabPress,
  pendingCount = 0,
  reportCount = 0,
  white,
  children,
}) => (
  <View style={[styles.root, white && styles.white]}>
    <StatusBar style="light" />
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.top}>
      <View style={styles.bar}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={ADMIN_COLORS.inkText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logo}>
            <Ionicons name={icon} size={17} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </SafeAreaView>

    <View style={styles.body}>{children}</View>

    {activeTab && (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tabSafe}>
        <View style={styles.tabbar}>
          {TABS.map((t) => {
            const on = t.id === activeTab;
            const badge = t.id === 'requests' ? pendingCount : t.id === 'manage' ? reportCount : 0;
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.tab}
                onPress={() => !on && onTabPress?.(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Admin tab ${t.label}${badge ? `, ${badge} pending` : ''}`}
              >
                <View>
                  <Ionicons name={t.icon} size={21} color={on ? COLORS.primary : ADMIN_COLORS.tabInactive} />
                  {badge > 0 && (
                    <View style={styles.dot}>
                      <Text style={styles.dotText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    )}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  white: { backgroundColor: '#FFFFFF' },
  top: { backgroundColor: ADMIN_COLORS.ink },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#7B2CBF', alignItems: 'center', justifyContent: 'center' },
  backBtn: { paddingVertical: 4 },
  titles: { flex: 1, minWidth: 0 },
  title: { color: ADMIN_COLORS.inkText, fontSize: 18, fontWeight: '800' },
  subtitle: { color: ADMIN_COLORS.inkMuted, fontSize: 12, marginTop: 1 },
  body: { flex: 1 },
  tabSafe: { backgroundColor: ADMIN_COLORS.ink },
  tabbar: { height: 60, flexDirection: 'row', alignItems: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabText: { fontSize: 11, fontWeight: '600', color: ADMIN_COLORS.tabInactive },
  tabTextOn: { color: '#FFFFFF' },
  dot: { position: 'absolute', top: -6, right: -14, backgroundColor: '#E11D48', borderRadius: 8, paddingHorizontal: 5, minWidth: 16, alignItems: 'center' },
  dotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', lineHeight: 16 },
});
