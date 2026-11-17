import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArtistRequestData } from '../utils/artistRequest';
import { formatDate } from '../utils/plan';

interface ProfileRoleCardProps {
  onBecomeArtist?: () => void;
  onOpenRequestStatus?: () => void;
  onOpenStudio?: () => void;
  onOpenMyArtistPage?: () => void;
}

// Thẻ trên Profile thay đổi theo vai trò:
// - listener: "Become an artist" (A1) / yêu cầu đang chờ (A4b) / cần sửa
// - artist: lối vào Artist Studio và trang nghệ sĩ (A6)
// (Tài khoản admin dùng khu Admin riêng, không vào Profile này)
export const ProfileRoleCard: React.FC<ProfileRoleCardProps> = ({
  onBecomeArtist,
  onOpenRequestStatus,
  onOpenStudio,
  onOpenMyArtistPage,
}) => {
  const { currentUser, isArtist } = useAuth();
  const [request, setRequest] = useState<ArtistRequestData | null>(null);
  const role = currentUser?.role ?? 'listener';

  useEffect(() => {
    let alive = true;
    if (role === 'listener') {
      api.artistRequests
        .getMine()
        .then((res) => alive && setRequest(res?.data ?? null))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [role, currentUser?.id]);

  if (isArtist) {
    return (
      <View style={[styles.box, styles.artistBox]}>
        {[
          { title: 'Artist Studio', sub: 'Upload songs, albums, edit your page', icon: 'musical-notes' as const, bg: '#E6FAFB', color: COLORS.primaryDark, onPress: onOpenStudio },
          { title: 'View my artist page', sub: 'How listeners see you', icon: 'person-outline' as const, bg: COLORS.tagBg, color: COLORS.textPrimary, onPress: onOpenMyArtistPage },
        ].map((item, i) => (
          <TouchableOpacity key={item.title} style={[styles.menuItem, i === 0 && styles.menuDivider]} onPress={item.onPress} activeOpacity={0.7} accessibilityLabel={item.title}>
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}><Ionicons name={item.icon} size={18} color={item.color} /></View>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (request?.status === 'pending' || request?.status === 'rejected') {
    const pending = request.status === 'pending';
    return (
      <TouchableOpacity
        style={[styles.box, pending ? styles.pendingBox : styles.rejectedBox]}
        onPress={onOpenRequestStatus}
        activeOpacity={0.8}
        accessibilityLabel={pending ? 'Artist request pending' : 'Artist request needs changes'}
      >
        <Ionicons name={pending ? 'time-outline' : 'alert-circle-outline'} size={24} color={pending ? '#D97706' : '#E11D48'} />
        <View style={styles.flex}>
          <Text style={styles.title}>{pending ? 'Artist request pending' : 'Artist request needs changes'}</Text>
          <Text style={styles.sub}>
            {pending ? `Sent ${formatDate(request.createdAt)} · ${request.stageName}` : `Tap to see the reason · ${request.stageName}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={['#4E2A84', '#9B30FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promo}>
      <View style={styles.promoHead}>
        <Ionicons name="mic" size={16} color="#FFFFFF" />
        <Text style={styles.promoTitle}>Are you an artist?</Text>
      </View>
      <Text style={styles.promoText}>Create your artist page, upload your songs and talk with your fans.</Text>
      <TouchableOpacity style={styles.promoBtn} onPress={onBecomeArtist} activeOpacity={0.85} accessibilityLabel="Become an artist">
        <Text style={styles.promoBtnText}>Become an artist</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  box: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminBox: { borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' },
  pendingBox: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  rejectedBox: { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  count: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  artistBox: { flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  promo: { borderRadius: 18, padding: 16, marginBottom: 28 },
  promoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  promoTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  promoText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  promoBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 40, alignItems: 'center', justifyContent: 'center' },
  promoBtnText: { color: '#4E2A84', fontWeight: '800', fontSize: 14 },
});
