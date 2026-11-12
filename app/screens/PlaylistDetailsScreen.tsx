import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { getSongsByIds, Playlist, PLAYLIST_DETAILS_TRACKS, Song } from '../../src/data/musicData';
import { TrackListView } from '../../src/components/TrackListView';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
import { useAccess } from '../../src/context/AccessContext';
import { api } from '../../src/services/api';

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
  const { currentUser, toggleLikeSong, userPlaylists, removeSongFromPlaylist, deletePlaylist } = useAuth();
  const { ensureMember } = useAccess();
  const [dbTracks, setDbTracks] = useState<Song[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Playlist của chính người dùng: lấy bản mới nhất trong AuthContext để thấy ngay khi thêm/xoá bài
  const ownPlaylist = playlist ? userPlaylists.find((pl) => pl.id === playlist.id) : undefined;
  const isAlbum = playlist?.ownerId === 'album';

  useEffect(() => {
    let isMounted = true;
    // Playlist của người dùng đã có đủ dữ liệu bài hát trên máy
    if (!ownPlaylist && playlist && playlist.songIds && playlist.songIds.length > 0) {
      api.songs.getByIds(playlist.songIds)
        .then((res: any) => {
          const list = res?.data || res;
          if (isMounted && Array.isArray(list) && list.length > 0) {
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
    currentTracks = getSongsByIds(ownPlaylist.songIds);
  } else {
    const localTracks = playlist && playlist.songIds?.length
      ? getSongsByIds(playlist.songIds)
      : PLAYLIST_DETAILS_TRACKS;
    currentTracks = dbTracks.length > 0 ? dbTracks : localTracks;
  }

  const handleDelete = () => {
    if (!ownPlaylist) return;
    setConfirmDelete(false);
    deletePlaylist(ownPlaylist.id);
    onBack && onBack();
  };

  const shown = ownPlaylist ?? playlist;

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
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => setConfirmDelete(true)}
            accessibilityLabel="Delete playlist"
          >
            <Feather name="trash-2" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
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
        emptyText="This playlist has no songs yet."
        onNavigateToPlay={onNavigateToPlay}
        onToggleLike={(songId) => ensureMember() && toggleLikeSong(songId)}
        onRemoveSong={ownPlaylist ? (songId) => removeSongFromPlaylist(ownPlaylist.id, songId) : undefined}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab={playlist?.ownerId === 'chart' ? 'Home' : 'Library'}
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />

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
