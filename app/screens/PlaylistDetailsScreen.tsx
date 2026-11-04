import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { PLAYLIST_DETAILS_TRACKS } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import {useAudioPlayer} from "../../src/context/AudioPlayerContext"
interface PlaylistDetailsScreenProps {
  onBack?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const PlaylistDetailsScreen: React.FC<PlaylistDetailsScreenProps> = ({
  onBack,
  onNavigateToPlay,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();

  const keyExtractor = useCallback((item: (typeof PLAYLIST_DETAILS_TRACKS)[0]) => item.id, []);

  const renderSongItem = useCallback(({ item }: { item: (typeof PLAYLIST_DETAILS_TRACKS)[0] }) => (
    <SongItem
      song={item}
      rightAction="dots"
      onPress={() => {
        playSong(item, PLAYLIST_DETAILS_TRACKS);
        if (onNavigateToPlay) {
          onNavigateToPlay(item.id);
        }
      }}
    />
  ), [playSong, onNavigateToPlay]);

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

      <FlatList
        data={PLAYLIST_DETAILS_TRACKS}
        keyExtractor={keyExtractor}
        renderItem={renderSongItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <>
            {/* Playlist Banner */}
            <View style={styles.bannerContainer}>
              <Image
                source={IMAGES.playlistDetailsCover}
                style={styles.coverImage}
                fadeDuration={0}
              />

              <View style={styles.bannerInfo}>
                <Text style={styles.playlistTitle}>Top 50 - Canada</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="heart-outline" size={14} color="#10C7D5" />
                  <Text style={styles.metaCount}>1,234</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaDuration}>05:10:18</Text>
                </View>
                <Text style={styles.description}>Daily chart-toppers update</Text>
              </View>
            </View>

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
              <View style={styles.leftActions}> 
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="heart-outline" size={24} color="#111216" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={24}
                    color="#111216"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.rightActions}>
                <TouchableOpacity style={styles.shuffleBtn} onPress={() => {
                  playSong(PLAYLIST_DETAILS_TRACKS[0], PLAYLIST_DETAILS_TRACKS);
                  if (onNavigateToPlay) {
                    onNavigateToPlay(PLAYLIST_DETAILS_TRACKS[0].id);
                  } 
                }}>
                  <Ionicons name="shuffle" size={22} color="#111216" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => onNavigateToPlay && onNavigateToPlay('pdt1')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Home"
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
  metaDuration: {
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
    paddingBottom: 20,
  },
});
