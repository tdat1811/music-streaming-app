import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { getSongsByIds, Playlist, PLAYLIST_DETAILS_TRACKS, Song } from '../../src/data/musicData';
import { TrackListView } from '../../src/components/TrackListView';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { MAX_PLAYLIST_TITLE_LENGTH, useAuth } from '../../src/context/AuthContext';
import { useAccess } from '../../src/context/AccessContext';
import { api } from '../../src/services/api';
import { sortByPlays } from '../../src/utils/plays';
import { useSongsByIds } from '../../src/hooks/useSongsByIds';
import { registerSongs } from '../../src/data/songRegistry';

interface PlaylistDetailsScreenProps {
  playlist?: Playlist | null;
  onBack?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const PlaylistDetailsScreen: React.FC<PlaylistDetailsScreenProps> = ({
  playlist,
  onBack,
  onNavigateToPlay,
  onTabPress,
}) => {
  const { currentUser, toggleLikeSong, userPlaylists, removeSongFromPlaylist, deletePlaylist, renamePlaylist } = useAuth();
  const { ensureMember } = useAccess();
  const [dbTracks, setDbTracks] = useState<Song[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Hộp thoại đổi tên playlist: null = đang đóng
  const [renameText, setRenameText] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Playlist của chính người dùng: lấy bản mới nhất trong AuthContext để thấy ngay khi thêm/xoá bài
  const ownPlaylist = playlist ? userPlaylists.find((pl) => pl.id === playlist.id) : undefined;
  // Bài trong playlist của mình: có cả bài nghệ sĩ tải lên (lấy từ máy chủ khi chưa có trên máy)
  const ownTracks = useSongsByIds(ownPlaylist?.songIds ?? []);
  const isAlbum = playlist?.ownerId === 'album';

  useEffect(() => {
    let isMounted = true;
    // Playlist của người dùng đã có đủ dữ liệu bài hát trên máy
    if (!ownPlaylist && playlist && playlist.songIds && playlist.songIds.length > 0) {
      api.songs.getByIds(playlist.songIds)
        .then((res: any) => {
          const list = res?.data || res;
          if (isMounted && Array.isArray(list) && list.length > 0) {
            registerSongs(list);
            setDbTracks(list);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [playlist, !!ownPlaylist]);

  let currentTracks: Song[];
  if (ownPlaylist) {
    currentTracks = ownTracks;
  } else {
    const localTracks = playlist && playlist.songIds?.length
      ? getSongsByIds(playlist.songIds)
      : PLAYLIST_DETAILS_TRACKS;
    currentTracks = dbTracks.length > 0 ? dbTracks : localTracks;
  }

  // Chi tiết bảng xếp hạng: xếp hạng bài hát theo số lượt nghe (trường "plays") giảm dần
  // (playlist null là bảng xếp hạng mẫu "Top 50 - Canada")
  const isChart = !playlist || playlist.ownerId === 'chart';
  if (isChart) currentTracks = sortByPlays(currentTracks);

  const handleDelete = () => {
    if (!ownPlaylist) return;
    setConfirmDelete(false);
    deletePlaylist(ownPlaylist.id);
    onBack && onBack();
  };

  const shown = ownPlaylist ?? playlist;

  const openRename = () => {
    if (!ownPlaylist) return;
    setRenameError(null);
    setRenameText(ownPlaylist.title);
  };

  const closeRename = () => {
    if (!renaming) setRenameText(null);
  };

  const submitRename = async () => {
    if (!ownPlaylist || renameText === null || renaming) return;
    setRenaming(true);
    const error = await renamePlaylist(ownPlaylist.id, renameText);
    setRenaming(false);
    if (error) {
      setRenameError(error);
    } else {
      setRenameText(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerIconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {ownPlaylist && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={openRename}
              accessibilityLabel="Rename playlist"
            >
              <Feather name="edit-2" size={21} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={() => setConfirmDelete(true)}
              accessibilityLabel="Delete playlist"
            >
              <Feather name="trash-2" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TrackListView
        title={shown?.title || 'Top 50 - Canada'}
        albumId={isAlbum ? playlist?.id : undefined}
        description={shown?.description || 'Daily chart-toppers update'}
        coverImage={shown?.coverImage || IMAGES.playlistDetailsCover}
        tracks={currentTracks.map((song) => ({
          ...song,
          isLiked: currentUser?.likedSongIds.includes(song.id),
        }))}
        showExtraActions
        showRank={isChart}
        emptyText="This playlist has no songs yet."
        onNavigateToPlay={onNavigateToPlay}
        onToggleLike={(songId) => ensureMember() && toggleLikeSong(songId)}
        onRemoveSong={ownPlaylist ? (songId) => removeSongFromPlaylist(ownPlaylist.id, songId) : undefined}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab={isChart ? 'Home' : 'Library'}
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />

      <Modal visible={renameText !== null} transparent animationType="fade" onRequestClose={closeRename}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename playlist</Text>
            <TextInput
              style={[styles.renameInput, !!renameError && styles.renameInputError]}
              value={renameText ?? ''}
              onChangeText={(text) => {
                setRenameText(text);
                setRenameError(null);
              }}
              placeholder="Playlist name"
              placeholderTextColor="#9CA3AF"
              maxLength={MAX_PLAYLIST_TITLE_LENGTH}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={submitRename}
              accessibilityLabel="Playlist name"
            />
            {!!renameError && <Text style={styles.renameError}>{renameError}</Text>}
            <TouchableOpacity
              style={[styles.saveButton, (!renameText?.trim() || renaming) && styles.saveButtonDisabled]}
              onPress={submitRename}
              disabled={!renameText?.trim() || renaming}
            >
              {renaming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeRename}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete playlist?</Text>
            <Text style={styles.dialogText}>
              "{ownPlaylist?.title}" will be removed from your library.
            </Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111216',
    marginTop: 4,
  },
  renameInputError: {
    borderColor: '#E11D48',
  },
  renameError: {
    color: '#E11D48',
    fontSize: 13,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#10C7D5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
