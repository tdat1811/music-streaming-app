import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { StudioAlbum } from '../../src/utils/studio';
import { AppButton, Badge, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { BottomSheet, ConfirmDialog, CoverImage, SheetAction } from '../../src/components/StudioUi';

interface StudioAlbumsScreenProps {
  onBack?: () => void;
  // null = tạo album mới
  onEditAlbum?: (albumId: string | null) => void;
}

// S7: danh sách album của nghệ sĩ
export const StudioAlbumsScreen: React.FC<StudioAlbumsScreenProps> = ({ onBack, onEditAlbum }) => {
  const [albums, setAlbums] = useState<StudioAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudioAlbum | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StudioAlbum | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.studio.getAlbums();
      setAlbums(res.data ?? []);
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

  // Đăng / gỡ đăng: gửi lại toàn bộ thông tin album với trạng thái mới
  const setStatus = async (album: StudioAlbum, status: 'published' | 'draft') => {
    setSelected(null);
    setBusy(true);
    try {
      const res = await api.studio.saveAlbum(album.id, {
        title: album.title,
        releaseYear: album.releaseYear,
        songIds: album.songIds,
        coverImage: album.coverImage,
        status,
      });
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, ...res.data } : a)));
      setNotice(status === 'published' ? `"${album.title}" is published.` : `"${album.title}" is now a draft.`);
    } catch (err) {
      setNotice(isApiError(err) ? err.message : "Can't connect to the server.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.studio.deleteAlbum(confirmDelete.id);
      setAlbums((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      setNotice(`"${confirmDelete.title}" was deleted. Its songs are not affected.`);
    } catch (err) {
      setNotice(isApiError(err) ? err.message : "Can't connect to the server.");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const renderItem = ({ item }: { item: StudioAlbum }) => (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={() => onEditAlbum?.(item.id)} accessibilityLabel={`Edit album ${item.title}`}>
        <CoverImage uri={item.coverImage} size={64} radius={12} icon="disc-outline" />
        <View style={styles.rowText}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.sub}>
            {item.releaseYear} · {item.songIds.length} song{item.songIds.length === 1 ? '' : 's'}
            {item.status === 'published' && item.publishedSongCount !== item.songIds.length ? ` (${item.publishedSongCount} visible)` : ''}
          </Text>
          <View style={styles.badge}>
            <Badge label={item.status === 'published' ? 'Published' : 'Draft'} tone={item.status === 'published' ? 'ok' : 'pending'} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSelected(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={`Options for ${item.title}`}>
        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const newAlbumCard = (
    <TouchableOpacity style={styles.newCard} onPress={() => onEditAlbum?.(null)} accessibilityLabel="New album">
      <Ionicons name="add" size={26} color={COLORS.primary} />
      <Text style={styles.newTitle}>New album</Text>
      <Text style={styles.sub}>Group your songs into an album or EP</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Albums"
        onBack={onBack}
        right={
          <TouchableOpacity onPress={() => onEditAlbum?.(null)} accessibilityLabel="Create album">
            <Ionicons name="add" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />
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
          data={albums}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListFooterComponent={newAlbumCard}
        />
      )}

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text style={styles.sheetTitle}>{selected.title}</Text>
            <SheetAction icon="create-outline" label="Edit" onPress={() => { setSelected(null); onEditAlbum?.(selected.id); }} />
            {selected.status === 'published' ? (
              <SheetAction icon="eye-off-outline" label="Unpublish (move to draft)" disabled={busy} onPress={() => setStatus(selected, 'draft')} />
            ) : (
              <SheetAction
                icon="cloud-upload-outline"
                label="Publish"
                disabled={busy || !selected.publishedSongCount}
                hint={!selected.publishedSongCount ? 'Add at least one published song first' : undefined}
                onPress={() => setStatus(selected, 'published')}
              />
            )}
            <SheetAction icon="trash-outline" label="Delete album" hint="Songs inside are not deleted" danger onPress={() => { setSelected(null); setConfirmDelete(selected); }} />
            <AppButton label="Cancel" variant="ghost" onPress={() => setSelected(null)} />
          </>
        )}
      </BottomSheet>

      <ConfirmDialog visible={!!confirmDelete} title={`Delete "${confirmDelete?.title}"?`} message="The album will be removed. The songs inside it stay in My songs." onClose={() => setConfirmDelete(null)}>
        <AppButton label="Delete album" variant="danger" onPress={remove} loading={busy} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setConfirmDelete(null)} />
      </ConfirmDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  noticeWrap: { paddingHorizontal: 20, marginBottom: 6 },
  loader: { marginTop: 40 },
  pad: { padding: 20 },
  mt12: { marginTop: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  rowText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14.5, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { marginTop: 5 },
  newCard: { marginTop: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 16, padding: 18, alignItems: 'center' },
  newTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
});
