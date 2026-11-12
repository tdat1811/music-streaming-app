import React, { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Song } from '../data/musicData';
import { parseDuration, shuffleTracks, useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { SongItem } from './SongItem';
import { SongActionModal } from './SongActionModal';
import { AlbumActionModal } from './AlbumActionModal';
import { toImageSource } from '../utils/imageSource';
import { useRefreshControl } from '../context/RefreshContext';

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
  // Id album dùng để thích album (bỏ trống nếu không phải album)
  albumId?: string;
  description: string;
  coverImage: any;
  tracks: Song[];
  likesLabel?: string;
  durationLabel?: string;
  emptyText?: string;
  showExtraActions?: boolean;
  // Hiện số thứ tự xếp hạng bên trái mỗi bài (danh sách đã được sắp sẵn)
  showRank?: boolean;
  onNavigateToPlay?: (trackId?: string) => void;
  onToggleLike?: (songId: string) => void;
  // Có giá trị khi đây là playlist của chính người dùng
  onRemoveSong?: (songId: string) => void;
}

// Banner, nút phát và danh sách bài hát dùng chung cho Playlist Details và các danh sách của user
export const TrackListView: React.FC<TrackListViewProps> = ({
  title,
  albumId,
  description,
  coverImage,
  tracks,
  likesLabel,
  durationLabel,
  emptyText,
  showExtraActions = true,
  showRank = false,
  onNavigateToPlay,
  onToggleLike,
  onRemoveSong,
}) => {
  const { playSong } = useAudioPlayer();
  const { toggleLikeAlbum, isAlbumLiked } = useAuth();
  const { ensureMember } = useAccess();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songModalVisible, setSongModalVisible] = useState(false);
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const refreshControl = useRefreshControl();

  const likeKey = albumId ?? title;
  const isLiked = isAlbumLiked(likeKey);

  const handleToggleAlbumLike = () => {
    if (!ensureMember()) return;
    toggleLikeAlbum(likeKey);
    Alert.alert(
      'Yêu thích',
      !isLiked
        ? `Đã thêm "${title}" vào danh sách yêu thích!`
        : `Đã xóa "${title}" khỏi danh sách yêu thích.`
    );
  };

  const handleShareAlbum = async () => {
    try {
      await Share.share({
        message: `Nghe "${title}" trên Soundwave! ${description}`,
      });
    } catch {}
  };

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
    ({ item, index }: { item: Song; index: number }) => (
      <SongItem
        song={item}
        rank={showRank ? index + 1 : undefined}
        rightAction="dots"
        onPress={() => playFrom(item, tracks)}
        onRightActionPress={() => {
          setSelectedSong(item);
          setSongModalVisible(true);
        }}
      />
    ),
    [playFrom, tracks, showRank]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderSongItem}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
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
              <Image source={toImageSource(coverImage)} style={styles.coverImage} fadeDuration={0} />

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
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleToggleAlbumLike}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isLiked ? '#10C7D5' : '#111216'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleShareAlbum}
                  activeOpacity={0.7}
                >
                  <Feather name="share-2" size={21} color="#111216" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setAlbumModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="dots-horizontal" size={24} color="#111216" />
                </TouchableOpacity>
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

      {/* Song Action Modal */}
      <SongActionModal
        visible={songModalVisible}
        song={selectedSong}
        onRemoveFromPlaylist={onRemoveSong}
        onClose={() => {
          setSongModalVisible(false);
          setSelectedSong(null);
        }}
      />

      {/* Album / Playlist Action Modal */}
      <AlbumActionModal
        visible={albumModalVisible}
        title={title}
        description={description}
        coverImage={coverImage}
        tracks={tracks}
        isLiked={isLiked}
        onToggleLike={handleToggleAlbumLike}
        onClose={() => setAlbumModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111216',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10C7D5',
    marginLeft: 4,
  },
  metaDot: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#686A70',
  },
  description: {
    fontSize: 13,
    color: '#686A70',
    lineHeight: 18,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    padding: 6,
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111216',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 110,
  },
  emptyText: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
