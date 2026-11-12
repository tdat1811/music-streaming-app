import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Share,
  Alert,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { getSongsByIds, Song } from '../../src/data/musicData';
import { SongActionModal } from '../../src/components/SongActionModal';
import { toImageSource } from '../../src/utils/imageSource';
import { IMAGES } from '../../src/constants/images';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { useAuth } from '../../src/context/AuthContext';
import { useFeed } from '../../src/context/FeedContext';
import { useRefreshControl } from '../../src/context/RefreshContext';
import { RefreshButton } from '../../src/components/RefreshButton';

interface FeedScreenProps {
  // Mở từ thông báo: cuộn tới bài đăng này và nháy sáng nhẹ
  focusPostId?: string | null;
  onFocusHandled?: () => void;
  onOpenComments?: (postId: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onRequireLogin?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  focusPostId,
  onFocusHandled,
  onOpenComments,
  onNavigateToPlay,
  onRequireLogin,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();
  const { currentUser } = useAuth();
  const { posts, togglePostLike, addShare, getCommentCount } = useFeed();
  // Bài hát của bài đăng đang mở menu "..."
  const [menuSong, setMenuSong] = useState<Song | null>(null);
  const refreshControl = useRefreshControl();

  // ---- Cuộn tới bài đăng khi mở từ thông báo ----
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const postY = useRef<Record<string, number>>({});
  const focusFlash = useRef(new Animated.Value(0)).current;
  // Giữ id đang nháy sáng sau khi Navigation đã xoá focusPostId
  const [flashPostId, setFlashPostId] = useState<string | null>(null);

  const tryFocus = () => {
    if (!focusPostId) return;
    const y = postY.current[focusPostId];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: false });
    setFlashPostId(focusPostId);
    if (onFocusHandled) onFocusHandled();
  };

  useEffect(() => {
    tryFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPostId]);

  useEffect(() => {
    if (!flashPostId) return;
    const useNativeDriver = Platform.OS !== 'web';
    focusFlash.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(focusFlash, { toValue: 1, duration: 300, useNativeDriver }),
      Animated.timing(focusFlash, { toValue: 0, duration: 1600, delay: 800, useNativeDriver }),
    ]);
    anim.start(({ finished }) => finished && setFlashPostId(null));
    return () => anim.stop();
  }, [flashPostId, focusFlash]);

  // Hàng đợi phát là các bài hát có trong bảng tin
  const feedSongs = posts.flatMap((post) => getSongsByIds([post.songId]));

  const handlePlay = (song: Song) => {
    playSong(song, feedSongs);
    if (onNavigateToPlay) onNavigateToPlay(song.id);
  };

  const handleLike = (postId: string) => {
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    togglePostLike(postId);
  };

  const handleShare = async (postId: string, song: Song) => {
    try {
      const result = await Share.share({
        message: `Listen to ${song.title} by ${song.artist}`,
      });
      // Android không báo khi người dùng đóng bảng chia sẻ nên chỉ iOS mới có dismissedAction.
      // Bản web không trả về kết quả nên result có thể rỗng.
      if (result?.action !== Share.dismissedAction) addShare(postId);
    } catch {
      Alert.alert('Share is not available on this device.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <RefreshButton />
      </View>

      {/* Feed Posts List */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
      >
        {posts.map((post) => {
          const song = getSongsByIds([post.songId])[0];
          // Bài đăng trỏ tới bài hát không có trong dữ liệu thì bỏ qua thay vì làm lỗi màn hình
          if (!song) return null;
          const isLiked = !!currentUser && post.likedByUserIds.includes(currentUser.id);
          return (
          <View
            key={post.id}
            style={styles.postCard}
            onLayout={(e) => {
              postY.current[post.id] = e.nativeEvent.layout.y;
              if (post.id === focusPostId) tryFocus();
            }}
          >
            {flashPostId === post.id && (
              <Animated.View pointerEvents="none" style={[styles.focusFlash, { opacity: focusFlash }]} />
            )}
            {/* Post Header */}
            <View style={styles.authorRow}>
              <View style={styles.avatarWrapper}>
                <Image source={toImageSource(post.authorAvatar, IMAGES.homeAvatar)} style={styles.authorAvatar} />
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.authorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{post.authorName}</Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color="#00A3FF"
                    style={styles.verifiedIcon}
                  />
                </View>
                <Text style={styles.timeAgo}>
                  Posted a track  •  {post.timeAgo}
                </Text>
              </View>
            </View>

            {/* Post Media Card */}
            <TouchableOpacity
              style={styles.mediaContainer}
              onPress={() => handlePlay(song)}
              activeOpacity={0.9}
            >
              <Image source={toImageSource(song.coverImage)} style={styles.trackImage} />

              {/* Bottom Track Banner Overlay */}
              <View style={styles.trackBanner}>
                <View>
                  <Text style={styles.trackTitle}>{song.title}</Text>
                  <Text style={styles.trackAuthor}>{song.artist}</Text>
                </View>
                <View style={styles.trackMeta}>
                  <Ionicons name="play" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.trackStats}>{song.plays}</Text>
                  <Text style={styles.trackStatsDot}>•</Text>
                  <Text style={styles.trackStats}>{song.duration}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Post Actions Row */}
            <View style={styles.actionsRow}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleLike(post.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? COLORS.primary : '#4B5563'}
                  />
                  <Text style={styles.actionCount}>{post.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => onOpenComments && onOpenComments(post.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#4B5563" />
                  <Text style={styles.actionCount}>{getCommentCount(post.id)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleShare(post.id, song)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={22} color="#4B5563" />
                  <Text style={styles.actionCount}>{post.shares}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.moreButton}
                activeOpacity={0.7}
                onPress={() => setMenuSong(song)}
                accessibilityLabel="Post options"
              >
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={22}
                  color="#4B5563"
                />
              </TouchableOpacity>
            </View>
          </View>
          );
        })}
      </ScrollView>

      {/* Menu thao tác với bài hát của bài đăng */}
      <SongActionModal visible={menuSong !== null} song={menuSong} onClose={() => setMenuSong(null)} />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Feed"
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  focusFlash: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: 8,
    right: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 199, 213, 0.18)',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
  },
  castButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 76, // Chừa chỗ cho MiniPlayer
  },
  postCard: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  authorInfo: {
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111216',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#686A70',
    marginTop: 2,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  trackImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trackBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackAuthor: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStats: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  trackStatsDot: {
    color: '#FFFFFF',
    fontSize: 12,
    marginHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  moreButton: {
    padding: 2,
  },
});
