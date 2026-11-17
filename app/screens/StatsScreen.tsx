import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { CoverImage } from '../../src/components/StudioUi';
import { BarChart, RangeTabs, SectionTitle, SourceList, StatsInfoSheet, StatTile, statsStyles, TripleBox } from '../../src/components/StatsUi';
import { compactSources, deviceTz, formatChange, formatNumber, rangeLabel, SeriesPoint, signed, sinceLabel, StatsRange } from '../../src/utils/stats';
import { formatCount } from '../../src/utils/plays';

interface StatsScreenProps {
  onBack?: () => void;
  onOpenSong?: (songId: string) => void;
  onUpload?: () => void;
  onPostToFeed?: () => void;
}

// T1 / T2 / T4 / T6: thống kê của nghệ sĩ trong Artist Studio
export const StatsScreen: React.FC<StatsScreenProps> = ({ onBack, onOpenSong, onUpload, onPostToFeed }) => {
  const [range, setRange] = useState<StatsRange>('7');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(false);

  const load = useCallback(async (r: StatsRange, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.studio.getStats(r, deviceTz());
      setData(res.data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  const isAll = data?.range === 'all';
  const t = data?.tiles;
  const prevLabel = data && !isAll ? ` vs prev. ${data.range} days` : '';
  // All time: thêm cột "Before" cho lượt nghe cũ chưa có ngày
  const series: SeriesPoint[] = data ? (isAll && data.before > 0 ? [{ key: 'before', plays: data.before }, ...data.series] : data.series) : [];
  const since = sinceLabel(data?.statsSince);
  const topMax = Math.max(1, ...(data?.topSongs || []).map((s: any) => s.plays));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Stats"
        onBack={onBack}
        right={
          <TouchableOpacity onPress={() => setInfo(true)} accessibilityLabel="How stats are counted" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} />}
      >
        <RangeTabs value={range} onChange={setRange} />

        {loading && !data ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load(range)} style={styles.mt12} />
          </>
        ) : (
          data && (
            <View style={loading && styles.dim}>
              {isAll ? (
                <View style={statsStyles.grid}>
                  <StatTile label="Total plays" value={formatCount(t.plays.value)} note={sinceLabel(t.plays.since, false)} />
                  <StatTile label="Listeners" value={formatNumber(t.listeners.value)} note={sinceLabel(t.listeners.since)} />
                  <StatTile label="Followers" value={formatNumber(t.followers.value)} note={`${signed(t.followers.followed)} / ${signed(-t.followers.unfollowed)}`} />
                  <StatTile label="Song likes" value={formatNumber(t.songLikes.value)} note={`across ${t.songLikes.songs} song${t.songLikes.songs === 1 ? '' : 's'}`} />
                </View>
              ) : (
                <View style={statsStyles.grid}>
                  <StatTile label="Plays" value={formatNumber(t.plays.value)} change={t.plays.change} changeSuffix={prevLabel} />
                  <StatTile label="Listeners" value={formatNumber(t.listeners.value)} change={t.listeners.change} />
                  <StatTile label="New followers" value={signed(t.newFollowers.value)} change={t.newFollowers.change} />
                  <StatTile label="Song likes" value={signed(t.songLikes.value)} change={t.songLikes.change} />
                </View>
              )}

              {!data.hasPlays ? (
                // T4: chưa có lượt nghe
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}><Ionicons name="bar-chart-outline" size={32} color={COLORS.primaryDark} /></View>
                  <Text style={styles.emptyTitle}>{data.totalPlays > 0 ? 'No plays in this period' : 'No plays yet'}</Text>
                  <Text style={styles.emptyText}>
                    Your chart will appear here once fans start listening. Share your songs to reach more people.
                  </Text>
                  <AppButton label="Upload a song" onPress={onUpload} style={styles.emptyBtn} />
                  <AppButton label="Post on the Feed" variant="outline" onPress={onPostToFeed} style={[styles.emptyBtn, styles.mt8]} />
                </View>
              ) : (
                <>
                  <SectionTitle title={isAll ? 'Plays per month' : 'Plays per day'} right={isAll ? 'last 12 months' : rangeLabel(series)} />
                  <BarChart key={data.range} series={series} />

                  {data.topSongs.length > 0 && (
                    <>
                      <SectionTitle title={isAll ? 'All-time top songs' : 'Top songs'} right={isAll ? 'total plays' : 'by plays'} />
                      {data.topSongs.map((s: any, i: number) => {
                        const c = formatChange(s.change);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={styles.song}
                            onPress={() => onOpenSong?.(s.id)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Stats for ${s.title}`}
                          >
                            <Text style={styles.rank}>{i + 1}</Text>
                            <CoverImage uri={s.coverImage} size={40} radius={8} />
                            <View style={styles.flex}>
                              <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                              <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.max(3, (s.plays / topMax) * 100)}%` }]} /></View>
                            </View>
                            <View style={styles.songNum}>
                              <Text style={styles.songPlays}>{formatNumber(s.plays)}</Text>
                              {c && c.tone !== 'flat' && <Text style={[styles.songChange, { color: c.tone === 'up' ? '#16A34A' : '#E11D48' }]}>{c.text}</Text>}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {data.sources.length > 0 && (
                    <>
                      <SectionTitle title="Where plays come from" right={isAll ? 'all time' : 'all songs'} />
                      <SourceList sources={compactSources(data.sources, 4)} />
                    </>
                  )}
                </>
              )}

              <SectionTitle title="Followers" right={`${formatNumber(data.followers.total)} total`} />
              <TripleBox
                items={[
                  { value: signed(data.followers.followed), label: 'followed', tone: data.followers.followed ? 'up' : undefined },
                  { value: signed(-data.followers.unfollowed), label: 'unfollowed', tone: data.followers.unfollowed ? 'down' : undefined },
                  { value: signed(data.followers.net), label: 'net' },
                ]}
              />

              <SectionTitle title="Feed" right={`your ${data.feed.posts} post${data.feed.posts === 1 ? '' : 's'}${isAll ? '' : ' in this period'}`} />
              <TripleBox
                items={[
                  { value: formatNumber(data.feed.likes), label: 'likes' },
                  { value: formatNumber(data.feed.comments), label: 'comments' },
                  { value: formatNumber(data.feed.shares), label: 'shares' },
                ]}
              />

              <View style={styles.footer}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.textSecondary} />
                <Text style={styles.footerText}>{since ? `Daily stats ${since}.` : 'Daily stats start with your first counted play.'}</Text>
              </View>
            </View>
          )
        )}
      </ScrollView>

      <StatsInfoSheet visible={info} onClose={() => setInfo(false)} since={since} />
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
  mt8: { marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 26, paddingHorizontal: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E6FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 19, textAlign: 'center', marginBottom: 14 },
  emptyBtn: { alignSelf: 'stretch' },
  song: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  rank: { width: 16, textAlign: 'center', fontSize: 13, fontWeight: '900', color: COLORS.textSecondary },
  songTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  meter: { height: 5, borderRadius: 3, backgroundColor: COLORS.tagBg, marginTop: 5, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  songNum: { alignItems: 'flex-end', minWidth: 48 },
  songPlays: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  songChange: { fontSize: 10.5, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  footerText: { fontSize: 11.5, color: COLORS.textSecondary },
});
