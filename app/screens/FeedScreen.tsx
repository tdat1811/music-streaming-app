import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { FEED_SONGS, getSongsByIds, Song } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { useAuth } from '../../src/context/AuthContext';
import { useFeed } from '../../src/context/FeedContext';

interface FeedScreenProps {
  onOpenComments?: (postId: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onRequireLogin?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  onOpenComments,
  onNavigateToPlay,
  onRequireLogin,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();
  const { currentUser } = useAuth();
  const { posts, togglePostLike, addShare, getCommentCount } = useFeed();

  const handlePlay = (song: Song) => {
    playSong(song, FEED_SONGS);
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
        
      </View>

      {/* Feed Posts List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {posts.map((post) => {
          const song = getSongsByIds([post.songId])[0];
          const isLiked = !!currentUser && post.likedByUserIds.includes(currentUser.id);
          return (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.authorRow}>
              <View style={styles.avatarWrapper}>
                <Image source={post.authorAvatar} style={styles.authorAvatar} />
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
              <Image source={song.coverImage} style={styles.trackImage} />

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

              <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
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

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Feed"
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
