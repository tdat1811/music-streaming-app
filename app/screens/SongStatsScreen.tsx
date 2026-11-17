import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { CoverImage, SongStatusBadge } from '../../src/components/StudioUi';
import { BarChart, RangeTabs, SectionTitle, SourceList, StatTile, statsStyles } from '../../src/components/StatsUi';
import { deviceTz, formatNumber, rangeLabel, SeriesPoint, signed, StatsRange } from '../../src/utils/stats';
import { formatDate } from '../../src/utils/plan';

interface SongStatsScreenProps {
  songId: string | null;
  onBack?: () => void;
}

// T3: thống kê của một bài hát
export const SongStatsScreen: React.FC<SongStatsScreenProps> = ({ songId, onBack }) => {
  const [range, setRange] = useState<StatsRange>('7');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: StatsRange, refresh = false) => {
      if (!songId) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.studio.getSongStats(songId, r, deviceTz());
        setData(res.data);
      } catch (err) {
        setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [songId]
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  const isAll = data?.range === 'all';
  const t = data?.tiles;
  const series: SeriesPoint[] = data ? (isAll && data.before > 0 ? [{ key: 'before', plays: data.before }, ...data.series] : data.series) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Song stats" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} />}
      >
        {loading && !data ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load(range)} style={styles.mt12} />
          </>
        ) : (
          data && (
            <>
              <View style={styles.head}>
                <CoverImage uri={data.song.coverImage} size={64} radius={12} />
                <View style={styles.flex}>
                  <Text style={styles.title} numberOfLines={2}>{data.song.title}</Text>
                  <Text style={styles.sub}>
                    {[data.song.releasedAt && `Released ${formatDate(data.song.releasedAt)}`, data.song.duration].filter(Boolean).join(' · ')}
                  </Text>
                  {data.song.status !== 'published' && <View style={styles.badge}><SongStatusBadge status={data.song.status} /></View>}
                </View>
              </View>

              <RangeTabs value={range} onChange={setRange} />

              <View style={[statsStyles.grid, loading && styles.dim]}>
                <StatTile label="Plays" value={formatNumber(t.plays.value)} change={t.plays.change} note={isAll ? 'all time' : undefined} />
                <StatTile label="All-time plays" value={formatNumber(data.allTimePlays)} />
                <StatTile label="Liked by" value={isAll ? formatNumber(t.likes.value) : signed(t.likes.value)} />
                <StatTile label="Added to playlists" value={isAll ? formatNumber(t.playlistAdds.value) : signed(t.playlistAdds.value)} />
              </View>

              {data.hasPlays ? (
                <View style={loading && styles.dim}>
                  <SectionTitle title={isAll ? 'Plays per month' : 'Plays per day'} right={isAll ? 'last 12 months' : rangeLabel(series)} />
                  <BarChart key={data.range} series={series} height={100} />
                  {data.sources.length > 0 && (
                    <>
                      <SectionTitle title="Where plays come from" right="this song" />
                      <SourceList sources={data.sources} />
                    </>
                  )}
                </View>
              ) : (
                <Text style={styles.empty}>{data.allTimePlays > 0 ? 'No plays in this period.' : 'No plays yet.'}</Text>
              )}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  loader: { marginTop: 60 },
  dim: { opacity: 0.5 },
  mt12: { marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  badge: { alignSelf: 'flex-start', marginTop: 4 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13.5, marginTop: 36 },
});
