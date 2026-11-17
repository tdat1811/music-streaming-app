import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { deviceTz, formatChange, formatNumber, signed } from '../../src/utils/stats';
import { ruleLabel } from '../../src/utils/moderation';
import { api, isApiError } from '../../src/services/api';
import { formatCount } from '../../src/utils/plays';
import { AppButton, NameAvatar, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';

interface ArtistStudioScreenProps {
  onBack?: () => void;
  onUpload?: () => void;
  onOpenSongs?: () => void;
  onOpenAlbums?: () => void;
  onEditPage?: () => void;
  onViewPage?: (artistId: string) => void;
  // Bài đăng của mình trên Feed
  onOpenPosts?: (artistId: string, name: string) => void;
  onOpenStats?: () => void;
  onOpenInsight?: () => void;
}

// S1: trang chính của Artist Studio
export const ArtistStudioScreen: React.FC<ArtistStudioScreenProps> = ({ onBack, onUpload, onOpenSongs, onOpenAlbums, onEditPage, onViewPage, onOpenPosts, onOpenStats, onOpenInsight }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.studio.getOverview(deviceTz());
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

  const artist = data?.artist;
  const songs = data?.songs;
  const songSummary = songs
    ? [songs.published && `${songs.published} published`, songs.draft && `${songs.draft} draft`, songs.hidden && `${songs.hidden} hidden`].filter(Boolean).join(' · ') || 'No songs yet'
    : '';

  const menu: { title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string; onPress?: () => void }[] = [
    { title: 'My songs', sub: songSummary, icon: 'musical-notes', bg: '#E6FAFB', color: COLORS.primaryDark, onPress: onOpenSongs },
    { title: 'Albums', sub: data ? `${data.albums} album${data.albums === 1 ? '' : 's'}` : '', icon: 'disc-outline', bg: '#FCE7F3', color: '#DB2777', onPress: onOpenAlbums },
    {
      title: 'Posts',
      sub: data ? `${data.posts ?? 0} post${data.posts === 1 ? '' : 's'} on the Feed` : '',
      icon: 'newspaper-outline',
      bg: '#FEF3C7',
      color: '#D97706',
      onPress: () => artist && onOpenPosts?.(artist.id, artist.name),
    },
    {
      title: 'Stats',
      sub: data ? `${formatNumber(data.week?.plays ?? 0)} play${data.week?.plays === 1 ? '' : 's'} in the last 7 days` : '',
      icon: 'bar-chart-outline',
      bg: '#E0E7FF',
      color: '#4F46E5',
      onPress: onOpenStats,
    },
    {
      // Giai đoạn 6b: AI Fan Insight gộp vào AI Assistant (chat hỏi đáp + phân tích fan)
      title: 'AI Assistant',
      sub: 'Fan insight, ideas & captions – chat with AI',
      icon: 'sparkles',
      bg: '#F3E8FF',
      color: '#7B2CBF',
      onPress: onOpenInsight,
    },
    { title: 'Edit artist page', sub: 'Photo, name, bio, genres, links', icon: 'person-outline', bg: COLORS.tagBg, color: COLORS.textPrimary, onPress: onEditPage },
  ];
  // Dòng nhỏ dưới ô Total plays / Followers: thay đổi trong 7 ngày gần nhất
  const week = data?.week;
  const playsDelta = week && week.plays > 0 ? formatChange(week.playsChange) : null;
  const followDelta = week && week.newFollowers !== 0 ? { text: `${signed(week.newFollowers)} this week`, tone: week.newFollowers > 0 ? 'up' : 'down' } : null;
  const DELTA_COLOR: Record<string, string> = { up: '#16A34A', down: '#E11D48', flat: COLORS.textSecondary };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Artist Studio" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
          </>
        ) : (
          artist && (
            <>
              <View style={styles.head}>
                <NameAvatar name={artist.name} image={artist.avatarImage} size={48} />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{artist.name}</Text>
                    {artist.isVerified && <Ionicons name="checkmark-circle" size={15} color="#00A3FF" />}
                  </View>
                  <Text style={styles.sub}>{(artist.genres || []).join(' · ') || 'No genres yet'}</Text>
                </View>
                <TouchableOpacity onPress={() => onViewPage?.(artist.id)} accessibilityLabel="View page">
                  <Text style={styles.link}>View page</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stats}>
                {[
                  { n: String(songs.total), l: 'Songs', bg: '#E6FAFB', d: null as null | { text: string; tone: string } },
                  {
                    n: formatCount(data.totalPlays),
                    l: 'Total plays',
                    bg: '#FEF3C7',
                    d: playsDelta && playsDelta.tone !== 'flat' ? { text: `${playsDelta.text} this week`, tone: playsDelta.tone } : null,
                  },
                  { n: formatCount(data.followers), l: 'Followers', bg: '#F3E8FF', d: followDelta },
                ].map((s) => (
                  <View key={s.l} style={[styles.stat, { backgroundColor: s.bg }]}>
                    <Text style={styles.statN}>{s.n}</Text>
                    <Text style={styles.statL}>{s.l}</Text>
                    {s.d && <Text style={[styles.statD, { color: DELTA_COLOR[s.d.tone] }]}>{s.d.text}</Text>}
                  </View>
                ))}
              </View>

              {artist.hiddenAt ? (
                // Giai đoạn 5: trang bị admin ẩn → không đăng thêm được, báo lý do
                <View style={styles.hiddenBox}>
                  <Text style={styles.hiddenTitle}>Your artist page is hidden by a moderator</Text>
                  <Text style={styles.hiddenText}>
                    Reason: {ruleLabel(artist.hiddenReason)}. Listeners can't see your page, songs or posts, and you can't publish until it's visible again.
                  </Text>
                </View>
              ) : (
                <AppButton label="Upload a song" onPress={onUpload} style={styles.upload} />
              )}

              {menu.map((m) => (
                <TouchableOpacity key={m.title} style={styles.menuItem} onPress={m.onPress} activeOpacity={0.7} accessibilityLabel={m.title}>
                  <View style={[styles.menuIcon, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={18} color={m.color} /></View>
                  <View style={styles.flex}>
                    <Text style={styles.menuTitle}>{m.title}</Text>
                    {!!m.sub && <Text style={styles.sub}>{m.sub}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  hiddenBox: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 14, padding: 12, marginTop: 14, marginBottom: 6 },
  hiddenTitle: { fontSize: 14, fontWeight: '800', color: '#9F1239' },
  hiddenText: { fontSize: 12.5, color: '#9F1239', marginTop: 3, lineHeight: 18 },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  mt12: { marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, flexShrink: 1 },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 14, padding: 12 },
  statN: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  statL: { fontSize: 11.5, fontWeight: '600', color: COLORS.textSecondary },
  statD: { fontSize: 10.5, fontWeight: '800', marginTop: 2 },
  upload: { marginTop: 14, marginBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  dim: { opacity: 0.45 },
});
