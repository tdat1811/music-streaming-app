import React, { useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Song } from '../data/musicData';
import { parseDuration, shuffleTracks, useAudioPlayer } from '../context/AudioPlayerContext';
import { SongItem } from './SongItem';

const formatTotalDuration = (tracks: Song[]) => {
  const totalSeconds = tracks.reduce((sum, track) => sum + parseDuration(track.duration) / 1000, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

interface TrackListViewProps {
  title: string;
  description: string;
  coverImage: any;
  tracks: Song[];
  likesLabel?: string;
  durationLabel?: string;
  emptyText?: string;
  showExtraActions?: boolean;
  onNavigateToPlay?: (trackId?: string) => void;
  onToggleLike?: (songId: string) => void;
}

// Banner, nút phát và danh sách bài hát dùng chung cho Playlist Details và các danh sách của user
export const TrackListView: React.FC<TrackListViewProps> = ({
  title,
  description,
  coverImage,
  tracks,
  likesLabel,
  durationLabel,
  emptyText,
  showExtraActions = false,
  onNavigateToPlay,
  onToggleLike,
}) => {
  const { playSong } = useAudioPlayer();

  const playFrom = useCallback(
    (track: Song, queue: Song[]) => {
      playSong(track, queue);
      if (onNavigateToPlay) onNavigateToPlay(track.id);
    },
    [playSong, onNavigateToPlay]
  );

  const handleShuffle = () => {
    const queue = shuffleTracks(tracks);
    playFrom(queue[0], queue);
  };

  const renderSongItem = useCallback(
    ({ item }: { item: Song }) => (
      <SongItem
        song={item}
        rightAction={onToggleLike ? 'heart' : 'dots'}
        onPress={() => playFrom(item, tracks)}
        onRightActionPress={onToggleLike ? () => onToggleLike(item.id) : undefined}
      />
    ),
    [playFrom, tracks, onToggleLike]
  );

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={renderSongItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews={true}
      ListEmptyComponent={emptyText ? <Text style={styles.emptyText}>{emptyText}</Text> : undefined}
      ListHeaderComponent={
        <>
          {/* Banner */}
          <View style={styles.bannerContainer}>
            <Image source={coverImage} style={styles.coverImage} fadeDuration={0} />

            <View style={styles.bannerInfo}>
              <Text style={styles.playlistTitle}>{title}</Text>
              <View style={styles.metaRow}>
                {likesLabel ? (
                  <>
                    <Ionicons name="heart-outline" size={14} color="#10C7D5" />
                    <Text style={styles.metaCount}>{likesLabel}</Text>
                  </>
                ) : (
                  <Text style={styles.metaText}>
                    {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
                  </Text>
                )}
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{durationLabel ?? formatTotalDuration(tracks)}</Text>
              </View>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>

          {/* Actions Bar */}
          <View style={styles.actionsBar}>
            <View style={styles.leftActions}>
              {showExtraActions && (
                <>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="heart-outline" size={24} color="#111216" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="dots-horizontal" size={24} color="#111216" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {tracks.length > 0 && (
              <View style={styles.rightActions}>
                <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle}>
                  <Ionicons name="shuffle" size={22} color="#111216" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => playFrom(tracks[0], tracks)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  bannerInfo: {
    flex: 1,
    marginLeft: 18,
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaCount: {
    fontSize: 12,
    color: '#686A70',
    marginLeft: 4,
  },
  metaDot: {
    fontSize: 12,
    color: '#686A70',
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#686A70',
  },
  description: {
    fontSize: 13,
    color: '#686A70',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  shuffleBtn: {
    padding: 4,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#121316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  listContent: {
    paddingBottom: 76, // Chừa chỗ cho MiniPlayer
  },
  emptyText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
});
