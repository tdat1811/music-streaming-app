import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { registerSongs } from '../../src/data/songRegistry';
import { canDeleteSong, SongAction, songActions, statusForAction, StudioSong } from '../../src/utils/studio';
import { formatCount } from '../../src/utils/plays';
import { formatDate } from '../../src/utils/plan';
import { ruleLabel } from '../../src/utils/moderation';
import { AppButton, Badge, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { BottomSheet, ConfirmDialog, CoverImage, SheetAction, SongStatusBadge } from '../../src/components/StudioUi';

type Tab = 'all' | 'published' | 'draft' | 'hidden';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'hidden', label: 'Hidden' },
];

const ACTION_UI: Record<SongAction, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  play: { icon: 'play', label: 'Play' },
  edit: { icon: 'create-outline', label: 'Edit details' },
  publish: { icon: 'cloud-upload-outline', label: 'Publish now' },
  hide: { icon: 'eye-off-outline', label: 'Hide from listeners' },
  show: { icon: 'eye-outline', label: 'Show again' },
  delete: { icon: 'trash-outline', label: 'Delete' },
};

interface StudioSongsScreenProps {
  onBack?: () => void;
  onUpload?: () => void;
  onEditSong?: (songId: string) => void;
  onNavigateToPlay?: () => void;
  // Mở thống kê của một bài (giai đoạn 4)
  onOpenStats?: (songId: string) => void;
}

// S4–S5: danh sách bài hát của nghệ sĩ, lọc theo trạng thái, menu thao tác
export const StudioSongsScreen: React.FC<StudioSongsScreenProps> = ({ onBack, onUpload, onEditSong, onNavigateToPlay, onOpenStats }) => {
  const { playSong } = useAudioPlayer();
  const [songs, setSongs] = useState<StudioSong[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudioSong | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StudioSong | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.studio.getSongs();
      setSongs(res.data ?? []);
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

  const counts = songs.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
  const shown = tab === 'all' ? songs : songs.filter((s) => s.status === tab);

  const play = (song: StudioSong) => {
    const asSong = { ...song, coverImage: song.coverImage || '' } as any;
    registerSongs([asSong]);
    playSong(asSong, shown as any);
    onNavigateToPlay?.();
  };

  const runAction = async (song: StudioSong, action: SongAction) => {
    setSelected(null);
    if (action === 'play') return play(song);
    if (action === 'edit') return onEditSong?.(song.id);
    if (action === 'delete') return setConfirmDelete(song);
    const status = statusForAction(action);
    if (!status) return;
    setBusy(true);
    try {
      const res = await api.studio.setSongStatus(song.id, status);
      setSongs((prev) => prev.map((s) => (s.id === song.id ? res.data : s)));
      setNotice(status === 'hidden' ? `"${song.title}" is hidden from listeners.` : `"${song.title}" is published.`);
    } catch (err) {
      setNotice(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.studio.deleteSong(confirmDelete.id);
      setSongs((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      setNotice(`"${confirmDelete.title}" was deleted.`);
    } catch (err) {
      setNotice(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const removedCount = songs.filter((s) => s.removedAt).length;

  const renderItem = ({ item }: { item: StudioSong }) =>
    item.removedAt ? (
      // Bài bị admin gỡ: chỉ hiện lý do, không có thao tác
      <View style={styles.row} accessibilityLabel={`${item.title}, removed by a moderator`}>
        <CoverImage uri={item.coverImage} />
        <View style={styles.rowText}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.sub, styles.removedText]} numberOfLines={2}>
            Removed by a moderator · {ruleLabel(item.removedRule)}
          </Text>
        </View>
        <Badge label="Removed" tone="bad" />
      </View>
    ) : (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={() => play(item)} accessibilityLabel={`Play ${item.title}`}>
        <CoverImage uri={item.coverImage} />
        <View style={styles.rowText}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {formatCount(item.plays)} plays{item.duration ? ` · ${item.duration}` : ''}{item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
      <SongStatusBadge status={item.status} />
      <TouchableOpacity onPress={() => setSelected(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={`Options for ${item.title}`}>
        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="My songs"
        onBack={onBack}
        right={
          <TouchableOpacity onPress={onUpload} accessibilityLabel="Upload a song">
            <Ionicons name="add" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.seg}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} style={[styles.segItem, tab === t.id && styles.segOn]} onPress={() => setTab(t.id)} accessibilityState={{ selected: tab === t.id }}>
            <Text style={[styles.segText, tab === t.id && styles.segTextOn]} numberOfLines={1}>
              {t.label}{t.id === 'all' ? ` (${songs.length})` : counts[t.id] ? ` (${counts[t.id]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {removedCount > 0 && (
        <View style={styles.noticeWrap}>
          <NoticeBox tone="error">
            {removedCount} song{removedCount === 1 ? ' was' : 's were'} removed for violating community standards. Removed songs can't be published again.
          </NoticeBox>
        </View>
      )}
      {!!notice && (
        <TouchableOpacity onPress={() => setNotice(null)} style={styles.noticeWrap}>
          <NoticeBox tone="info">{notice}</NoticeBox>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : error ? (
        <View style={styles.pad}>
          <NoticeBox tone="error">{error}</NoticeBox>
          <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{tab === 'all' ? "You haven't uploaded any songs yet." : 'No songs here.'}</Text>
              {tab === 'all' && <AppButton label="Upload a song" onPress={onUpload} style={styles.mt12} />}
            </View>
          }
          ListFooterComponent={shown.length ? <Text style={styles.hint}>Newest first · pull down to refresh</Text> : undefined}
        />
      )}

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <View style={styles.sheetHead}>
              <CoverImage uri={selected.coverImage} />
              <View style={styles.rowText}>
                <Text style={styles.title} numberOfLines={1}>{selected.title}</Text>
                <Text style={styles.sub}>{selected.status[0].toUpperCase() + selected.status.slice(1)} · {formatCount(selected.plays)} plays</Text>
              </View>
            </View>
            {songActions(selected).map((a) => {
              const blocked = a === 'delete' && !canDeleteSong(selected);
              return (
                <SheetAction
                  key={a}
                  icon={ACTION_UI[a].icon}
                  label={ACTION_UI[a].label}
                  danger={a === 'delete'}
                  disabled={blocked || busy}
                  hint={blocked ? 'Songs with plays can only be hidden' : undefined}
                  onPress={() => runAction(selected, a)}
                />
              );
            })}
            {selected.status !== 'draft' && (
              <SheetAction
                icon="bar-chart-outline"
                label="Stats"
                onPress={() => {
                  const id = selected.id;
                  setSelected(null);
                  onOpenStats?.(id);
                }}
              />
            )}
            <AppButton label="Cancel" variant="ghost" onPress={() => setSelected(null)} />
          </>
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={!!confirmDelete}
        title={`Delete "${confirmDelete?.title}"?`}
        message="This song has no plays yet. The song and its audio file will be removed permanently."
        onClose={() => setConfirmDelete(null)}
      >
        <AppButton label="Delete" variant="danger" onPress={remove} loading={busy} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setConfirmDelete(null)} />
      </ConfirmDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  removedText: { color: '#E11D48' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  seg: { flexDirection: 'row', backgroundColor: COLORS.tagBg, borderRadius: 12, padding: 4, marginHorizontal: 20, marginBottom: 8 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.textPrimary },
  noticeWrap: { paddingHorizontal: 20, marginBottom: 6 },
  loader: { marginTop: 40 },
  pad: { padding: 20 },
  mt12: { marginTop: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  rowText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  hint: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11.5, marginTop: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
});
