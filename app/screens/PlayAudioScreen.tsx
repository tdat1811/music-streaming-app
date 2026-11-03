import React, { useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { IMAGES } from '../../src/constants/images';
import {useAudioPlayer} from "../../src/context/AudioPlayerContext"
interface PlayAudioScreenProps {
  onMinimize?: () => void;
  onOpenComments?: () => void;
  trackTitle?: string;
  artistName?: string;
}

export const PlayAudioScreen: React.FC<PlayAudioScreenProps> = ({
  onMinimize,
  onOpenComments,
  trackTitle = 'FLOWER',
  artistName = 'Jessica Gonzalez',
}) => {
  const {currentTrack, isPlaying, positionMillis, durationMillis, playSong, togglePlayPause, playPrevious, playNext, seekTo} = useAudioPlayer();
  const [isLiked, setIsLiked] = useState(false);

  // 36 bars for waveform
  const waveformHeights = [
    12, 18, 28, 22, 34, 48, 54, 42, 30, 24, 38, 44,
    32, 26, 40, 50, 46, 32, 20, 28, 36, 42, 38, 28,
    22, 32, 40, 36, 26, 18, 24, 30, 22, 16, 12, 8,
  ];
  const progressIndex = 0; 

  const formatTime = (millims : number) => {
    if(!millims || millims < 0) return '0:00';
    const totalSecounds = Math.floor(millims / 1000);
    const minutes = Math.floor(totalSecounds / 60);
    const seconds = totalSecounds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  const progressPercent = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const currentWaveformIndex = Math.floor(progressPercent * 36);



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
            <Text style={styles.headerTitle}>Play</Text>
            <TouchableOpacity
              onPress={onMinimize}
              style={styles.headerIconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-down" size={26} color="#FFFFFF" />
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
            <View style={styles.waveformContainer}>
              {waveformHeights.map((h, i) => {
                const isPlayed = i <= currentWaveformIndex;
                return (
                  <TouchableOpacity
                  key = {i}
                  activeOpacity={0.8}
                  onPress={() => {
                    const seekTarget = (i / 36) * durationMillis;
                    seekTo(seekTarget);
                  }}
                  >
                  
                  <View
                    style={[
                      styles.waveformBar,
                      {
                        height: h,
                        backgroundColor: isPlayed
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.45)',
                      },
                    ]}
                  />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Timestamp Row */}
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlBtn}>
                <Ionicons name="shuffle" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={playPrevious}>
                <Ionicons name="play-skip-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={togglePlayPause}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#121316"
                  style={!isPlaying ? { marginLeft: 3 } : undefined}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={playNext}>
                <Ionicons name="play-skip-forward" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn}>
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={26}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Interactions Row */}
            <View style={styles.interactionsRow}>
              <View style={styles.leftInteractions}>
                <TouchableOpacity
                  style={styles.interactionItem}
                  onPress={() => setIsLiked(!isLiked)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? '#10C7D5' : '#FFFFFF'}
                  />
                  <Text style={styles.interactionCount}>12K</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.interactionItem}
                  onPress={onOpenComments}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.interactionCount}>450</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
                <Feather name="upload" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
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
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    marginBottom: 8,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
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
  shareBtn: {
    padding: 4,
  },
});
