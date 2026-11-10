import React, { useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { IMAGES } from '../../src/constants/images';
import {useAudioPlayer} from "../../src/context/AudioPlayerContext"
import { useAuth } from '../../src/context/AuthContext';
import { useFeed } from '../../src/context/FeedContext';
import { AudioWaveform } from '../../src/components/AudioWaveform';
import { SongActionModal } from '../../src/components/SongActionModal';
interface PlayAudioScreenProps {
  onMinimize?: () => void;
  onOpenComments?: (postId: string) => void;
  trackTitle?: string;
  artistName?: string;
}

export const PlayAudioScreen: React.FC<PlayAudioScreenProps> = ({
  onMinimize,
  onOpenComments,
  trackTitle = 'FLOWER',
  artistName = 'Jessica Gonzalez',
}) => {
  const {currentTrack, isPlaying, positionMillis, durationMillis, playSong, togglePlayPause, playPrevious, playNext, seekTo, isShuffle, repeatMode, toggleShuffle, cycleRepeatMode} = useAudioPlayer();
  const { currentUser, toggleLikeSong, downloadSong, isSongDownloaded } = useAuth();
  const isLiked = !!currentTrack && !!currentUser?.likedSongIds.includes(currentTrack.id);
  const isDownloaded = currentTrack ? isSongDownloaded(currentTrack.id) : false;
  const [songModalVisible, setSongModalVisible] = useState(false);

  const handleDownload = () => {
    if (!currentTrack) return;
    if (isDownloaded) {
      Alert.alert('Tải xuống', `Bài hát "${currentTrack.title}" đã có sẵn trong bộ nhớ ngoại tuyến của bạn.`);
    } else {
      downloadSong(currentTrack.id);
      Alert.alert('Tải xuống thành công', `Đã tải bài hát "${currentTrack.title}" về máy để nghe ngoại tuyến!`);
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `Nghe bài hát "${currentTrack.title}" của ${currentTrack.artist} trên Soundwave!`,
      });
    } catch {}
  };
  const { posts, getCommentCount } = useFeed();
  // Chỉ bài hát có bài post trên Feed mới có bình luận
  const trackPost = posts.find((post) => post.songId === currentTrack?.id);

  // Vị trí đang kéo trên thanh sóng, chỉ tua thật khi thả tay
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);

  const formatTime = (millims : number) => {
    if(!millims || millims < 0) return '0:00';
    const totalSecounds = Math.floor(millims / 1000);
    const minutes = Math.floor(totalSecounds / 60);
    const seconds = totalSecounds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  const displayedPosition = scrubRatio !== null ? scrubRatio * durationMillis : positionMillis;
  const progressPercent = durationMillis > 0 ? displayedPosition / durationMillis : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={IMAGES.playerConcertBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark gradient overlay for readability */}
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea}>
          {/* Top Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onMinimize}
              style={styles.headerIconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-down" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Play</Text>
            <TouchableOpacity
              onPress={() => setSongModalVisible(true)}
              style={styles.headerIconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="dots-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Bottom Player Controls Section */}
          <View style={styles.playerSection}>
            {/* Track Info */}
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle}>{currentTrack ? currentTrack.title : "No track"}</Text>
              <Text style={styles.artistName}>{currentTrack ? currentTrack.artist : "Unknown Artist"}</Text>
            </View>

            {/* Audio Waveform */}
            <AudioWaveform
              progress={progressPercent}
              isPlaying={isPlaying}
              onScrub={setScrubRatio}
              onSeek={(ratio) => seekTo(ratio * durationMillis)}
            />

            {/* Timestamp Row */}
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(displayedPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={toggleShuffle}
                accessibilityLabel={`Shuffle: ${isShuffle ? 'on' : 'off'}`}
              >
                <Ionicons name="shuffle" size={22} color={isShuffle ? '#10C7D5' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={playPrevious} accessibilityLabel="Previous track">
                <Ionicons name="play-skip-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={togglePlayPause}
                accessibilityLabel={isPlaying ? 'Pause' : 'Resume'}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#121316"
                  style={!isPlaying ? { marginLeft: 3 } : undefined}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={playNext} accessibilityLabel="Next track">
                <Ionicons name="play-skip-forward" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlBtn}
                onPress={cycleRepeatMode}
                accessibilityLabel={`Repeat: ${repeatMode}`}
              >
                <MaterialCommunityIcons
                  name={repeatMode === 'one' ? 'repeat-once' : 'repeat'}
                  size={24}
                  color={repeatMode === 'off' ? '#FFFFFF' : '#10C7D5'}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Interactions Row */}
            <View style={styles.interactionsRow}>
              <View style={styles.leftInteractions}>
                <TouchableOpacity
                  style={styles.interactionItem}
                  onPress={() => currentTrack && toggleLikeSong(currentTrack.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? '#10C7D5' : '#FFFFFF'}
                  />
                  <Text style={styles.interactionCount}>12K</Text>
                </TouchableOpacity>

                {trackPost && (
                  <TouchableOpacity
                    style={styles.interactionItem}
                    onPress={() => onOpenComments && onOpenComments(trackPost.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.interactionCount}>{getCommentCount(trackPost.id)}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.rightInteractions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleDownload}
                  activeOpacity={0.7}
                  accessibilityLabel="Download track"
                >
                  <Ionicons
                    name={isDownloaded ? "cloud-done" : "arrow-down-circle-outline"}
                    size={24}
                    color={isDownloaded ? "#10C7D5" : "#FFFFFF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleShare}
                  activeOpacity={0.7}
                  accessibilityLabel="Share track"
                >
                  <Feather name="upload" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Song Options Modal */}
            <SongActionModal
              visible={songModalVisible}
              song={currentTrack}
              onClose={() => setSongModalVisible(false)}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerIconBtn: {
    padding: 4,
  },
  spacer: {
    flex: 1,
  },
  playerSection: {
    width: '100%',
    paddingBottom: 8,
  },
  trackInfo: {
    marginBottom: 24,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  controlBtn: {
    padding: 8,
  },
  playPauseBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  interactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  leftInteractions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rightInteractions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  shareBtn: {
    padding: 4,
  },
});
