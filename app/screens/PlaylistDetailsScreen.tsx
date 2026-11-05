import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { getSongsByIds, Playlist, PLAYLIST_DETAILS_TRACKS } from '../../src/data/musicData';
import { TrackListView } from '../../src/components/TrackListView';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';

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

      {playlist ? (
        <TrackListView
          title={playlist.title}
          description={playlist.description}
          coverImage={playlist.coverImage}
          tracks={getSongsByIds(playlist.songIds).map((song) => ({
            ...song,
            isLiked: currentUser?.likedSongIds.includes(song.id),
          }))}
          emptyText="This playlist has no songs yet."
          onNavigateToPlay={onNavigateToPlay}
          onToggleLike={toggleLikeSong}
        />
      ) : (
        <TrackListView
          title="Top 50 - Canada"
          description="Daily chart-toppers update"
          coverImage={IMAGES.playlistDetailsCover}
          tracks={PLAYLIST_DETAILS_TRACKS}
          likesLabel="1,234"
          durationLabel="05:10:18"
          showExtraActions
          onNavigateToPlay={onNavigateToPlay}
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab={playlist ? 'Library' : 'Home'}
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
