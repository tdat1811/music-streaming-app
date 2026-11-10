import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { getSongsByIds, Playlist, PLAYLIST_DETAILS_TRACKS, Song } from '../../src/data/musicData';
import { TrackListView } from '../../src/components/TrackListView';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
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
  const { currentUser, toggleLikeSong } = useAuth();
  const [dbTracks, setDbTracks] = useState<Song[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (playlist && playlist.songIds && playlist.songIds.length > 0) {
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
  }, [playlist]);

  const localTracks = playlist && playlist.songIds?.length
    ? getSongsByIds(playlist.songIds)
    : PLAYLIST_DETAILS_TRACKS;

  const currentTracks = dbTracks.length > 0 ? dbTracks : localTracks;

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

        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <TrackListView
        title={playlist?.title || 'Top 50 - Canada'}
        description={playlist?.description || 'Daily chart-toppers update'}
        coverImage={playlist?.coverImage || IMAGES.playlistDetailsCover}
        tracks={currentTracks.map((song) => ({
          ...song,
          isLiked: currentUser?.likedSongIds.includes(song.id),
        }))}
        likesLabel="1,234"
        durationLabel="05:10:18"
        showExtraActions
        emptyText="This playlist has no songs yet."
        onNavigateToPlay={onNavigateToPlay}
        onToggleLike={toggleLikeSong}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab={playlist?.ownerId === 'chart' ? 'Home' : 'Library'}
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />
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
});
