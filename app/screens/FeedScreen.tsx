import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { FEED_POSTS, FeedPost } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';

interface FeedScreenProps {
  onOpenComments?: (postId: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  onOpenComments,
  onNavigateToPlay,
  onTabPress,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity style={styles.castButton} activeOpacity={0.7}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Feed Posts List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FEED_POSTS.map((post) => (
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
              onPress={() => onNavigateToPlay && onNavigateToPlay(post.id)}
              activeOpacity={0.9}
            >
              <Image source={post.trackImage} style={styles.trackImage} />

              {/* Bottom Track Banner Overlay */}
              <View style={styles.trackBanner}>
                <View>
                  <Text style={styles.trackTitle}>{post.trackTitle}</Text>
                  <Text style={styles.trackAuthor}>{post.authorName}</Text>
                </View>
                <View style={styles.trackMeta}>
                  <Ionicons name="play" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.trackStats}>{post.plays}</Text>
                  <Text style={styles.trackStatsDot}>•</Text>
                  <Text style={styles.trackStats}>{post.duration}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Post Actions Row */}
            <View style={styles.actionsRow}>
              <View style={styles.leftActions}>
                <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
                  <Ionicons name="heart-outline" size={22} color="#4B5563" />
                  <Text style={styles.actionCount}>{post.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => onOpenComments && onOpenComments(post.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#4B5563" />
                  <Text style={styles.actionCount}>{post.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="repeat" size={22} color="#4B5563" />
                  <Text style={styles.actionCount}>{post.reposts}</Text>
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
        ))}
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
    paddingBottom: 24,
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
