import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { getSongsByIds, Song, FeedPost } from '../../src/data/musicData';
import { isSongUnavailable } from '../../src/data/songRegistry';
import { useArtists } from '../../src/hooks/useArtists';
import { ComposePostSheet } from '../../src/components/ComposePostSheet';
import { BottomSheet, SheetAction, ConfirmDialog } from '../../src/components/StudioUi';
import { AppButton, NameAvatar, ScreenHeader } from '../../src/components/ArtistUi';
import { filterPosts, postSubtitle } from '../../src/utils/posts';
import { ReportSheet } from '../../src/components/ModerationUi';
import { useSongsByIds } from '../../src/hooks/useSongsByIds';
import { SongActionModal } from '../../src/components/SongActionModal';
import { toImageSource } from '../../src/utils/imageSource';
import { formatCount } from '../../src/utils/plays';
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
  // Chế độ "bài đăng của một nghệ sĩ" (My posts / See all posts): ẩn tab, có nút quay lại
  filterArtistId?: string | null;
  title?: string;
  onBack?: () => void;
  // Tab Following trống → mở danh sách nghệ sĩ
  onDiscoverArtists?: () => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({
  focusPostId,
  onFocusHandled,
  onOpenComments,
  onNavigateToPlay,
  onRequireLogin,
  onTabPress,
  filterArtistId,
  title,
  onBack,
  onDiscoverArtists,
}) => {
  const { playSong } = useAudioPlayer();
  const { currentUser } = useAuth();
  const { posts: allPosts, togglePostLike, addShare, getCommentCount, createPost, editPost, removePost } = useFeed();
  const artists = useArtists();
  // Bài hát của bài đăng đang mở menu "..."
  const [menuSong, setMenuSong] = useState<Song | null>(null);
  // Bài của chính nghệ sĩ đang mở menu Sửa / Xoá
  const [menuPost, setMenuPost] = useState<FeedPost | null>(null);
  const [tab, setTab] = useState<'forYou' | 'following'>('forYou');
  // Bảng viết bài: null = đóng, 'new' = bài mới, FeedPost = đang sửa
  const [composer, setComposer] = useState<'new' | FeedPost | null>(null);
  const [deleting, setDeleting] = useState<FeedPost | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bài đăng đang báo cáo (giai đoạn 5)
  const [reportPost, setReportPost] = useState<FeedPost | null>(null);
  // Báo cáo được bài của nghệ sĩ khác (có trang nghệ sĩ); admin không có phần nghe nhạc
  const canReportPost = (p: FeedPost) => !!p.authorArtistId && p.authorArtistId !== myArtistId && currentUser?.role !== 'admin';

  // Nghệ sĩ đang đăng nhập (để hiện ô "What's new" và menu Sửa / Xoá trên bài của mình)
  const myArtistId = currentUser?.role === 'artist' ? currentUser.artistId || null : null;
  const myArtist = myArtistId ? artists.find((a) => a.id === myArtistId) : undefined;
  const myName = myArtist?.name || currentUser?.name || '';
  const myAvatar = typeof myArtist?.avatarImage === 'string' ? myArtist.avatarImage : null;
  const canCompose = !!myArtistId && (!filterArtistId || filterArtistId === myArtistId);

  const posts = useMemo(
    () => filterPosts(allPosts, { tab, followedArtistIds: currentUser?.followedArtistIds || [], artistId: filterArtistId }),
    [allPosts, tab, currentUser?.followedArtistIds, filterArtistId]
  );
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
  // Bài hát của các bài đăng (lấy từ máy chủ khi chưa có trên máy, VD bài nghệ sĩ tải lên)
  const feedSongs = useSongsByIds(posts.map((post) => post.songId).filter(Boolean));

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

  const handleShare = async (post: FeedPost, song: Song | undefined) => {
    const postId = post.id;
    try {
      const result = await Share.share({
        message: song ? `Listen to ${song.title} by ${song.artist}` : `${post.authorName}: ${post.content || ''}`,
      });
      // Android không báo khi người dùng đóng bảng chia sẻ nên chỉ iOS mới có dismissedAction.
      // Bản web không trả về kết quả nên result có thể rỗng.
      if (result?.action !== Share.dismissedAction) addShare(postId);
    } catch {
      Alert.alert('Share is not available on this device.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const err = await removePost(deleting.id);
    setBusy(false);
    if (err) setDeleteError(err);
    else setDeleting(null);
  };

  const emptyState = () => {
    if (filterArtistId) {
      return <Text style={styles.emptyText}>{canCompose ? "You haven't posted anything yet." : 'No posts yet.'}</Text>;
    }
    if (tab === 'following' && !currentUser) {
      return (
        <>
          <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>See posts from artists you follow</Text>
          <AppButton label="Log in" onPress={onRequireLogin} style={styles.emptyBtn} />
        </>
      );
    }
    if (tab === 'following') {
      return (
        <>
          <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No posts from artists you follow</Text>
          <Text style={styles.emptyText}>Follow artists to see their updates and new songs here.</Text>
          <AppButton label="Discover artists" onPress={onDiscoverArtists} style={styles.emptyBtn} />
        </>
      );
    }
    return <Text style={styles.emptyText}>No posts yet.</Text>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      {filterArtistId ? (
        <ScreenHeader title={title || 'Posts'} onBack={onBack} />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Feed</Text>
            <RefreshButton />
          </View>
          <View style={styles.tabs}>
            {(['forYou', 'following'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
                accessibilityLabel={t === 'forYou' ? 'For you' : 'Following'}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'forYou' ? 'For you' : 'Following'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Feed Posts List */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
      >
        {/* Ô viết bài của nghệ sĩ */}
        {canCompose && (
          <TouchableOpacity style={styles.composer} onPress={() => setComposer('new')} activeOpacity={0.8} accessibilityLabel="Create post">
            <NameAvatar name={myName || 'A'} image={myAvatar} size={36} />
            <Text style={styles.composerText}>What's new, {myName}?</Text>
            <Ionicons name="musical-notes-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {posts.length === 0 && <View style={styles.empty}>{emptyState()}</View>}

        {posts.map((post) => {
          const song = post.songId ? getSongsByIds([post.songId])[0] : undefined;
          const isOwn = !!myArtistId && post.authorArtistId === myArtistId;
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
                  {post.authorVerified !== false && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#00A3FF"
                      style={styles.verifiedIcon}
                      accessibilityLabel="Verified artist"
                    />
                  )}
                </View>
                <Text style={styles.timeAgo}>{postSubtitle(post, !!post.songId)}</Text>
              </View>
            </View>

            {/* Nội dung chữ của bài */}
            {!!post.content && <Text style={styles.postText}>{post.content}</Text>}

            {/* Post Media Card */}
            {post.songId && !song ? (
              // Bài hát đã bị ẩn / xoá (hoặc đang tải)
              <View style={styles.unavailable}>
                <Ionicons name={isSongUnavailable(post.songId) ? 'musical-note-outline' : 'hourglass-outline'} size={20} color={COLORS.textMuted} />
                <Text style={styles.unavailableText}>{isSongUnavailable(post.songId) ? 'Song unavailable' : 'Loading song…'}</Text>
              </View>
            ) : song ? (
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
                  <Text style={styles.trackStats}>{formatCount(song.plays)}</Text>
                  <Text style={styles.trackStatsDot}>•</Text>
                  <Text style={styles.trackStats}>{song.duration}</Text>
                </View>
              </View>
            </TouchableOpacity>
            ) : null}

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
                  accessibilityLabel="Comments"
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#4B5563" />
                  <Text style={styles.actionCount}>{getCommentCount(post.id)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleShare(post, song)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={22} color="#4B5563" />
                  <Text style={styles.actionCount}>{post.shares}</Text>
                </TouchableOpacity>
              </View>

              {(isOwn || song || canReportPost(post)) && (
              <TouchableOpacity
                style={styles.moreButton}
                activeOpacity={0.7}
                onPress={() => setMenuPost(post)}
                accessibilityLabel="Post options"
              >
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={22}
                  color="#4B5563"
                />
              </TouchableOpacity>
              )}
            </View>
          </View>
          );
        })}
      </ScrollView>

      {/* Menu thao tác với bài hát của bài đăng */}
      <SongActionModal visible={menuSong !== null} song={menuSong} onClose={() => setMenuSong(null)} />

      {/* Menu bài của chính nghệ sĩ */}
      <BottomSheet visible={menuPost !== null} onClose={() => setMenuPost(null)}>
        {menuPost && menuPost.authorArtistId === myArtistId ? (
        <>
        <SheetAction
          icon="create-outline"
          label="Edit post"
          onPress={() => {
            setComposer(menuPost);
            setMenuPost(null);
          }}
        />
        <SheetAction
          icon="trash-outline"
          label="Delete post"
          danger
          onPress={() => {
            setDeleteError(null);
            setDeleting(menuPost);
            setMenuPost(null);
          }}
        />
        </>
        ) : null}
        {menuPost?.songId && getSongsByIds([menuPost.songId])[0] && (
          <SheetAction
            icon="musical-note-outline"
            label="Song options"
            onPress={() => {
              setMenuSong(getSongsByIds([menuPost.songId])[0]);
              setMenuPost(null);
            }}
          />
        )}
        {/* Báo cáo bài đăng của nghệ sĩ khác (giai đoạn 5) */}
        {menuPost && canReportPost(menuPost) && (
          <SheetAction
            icon="flag-outline"
            label="Report post"
            danger
            onPress={() => {
              const p = menuPost;
              setMenuPost(null);
              if (!currentUser) {
                onRequireLogin?.();
                return;
              }
              setReportPost(p);
            }}
          />
        )}
      </BottomSheet>

      <ReportSheet
        target={reportPost ? { type: 'post', id: reportPost.id, preview: reportPost.content || reportPost.authorName } : null}
        onClose={() => setReportPost(null)}
      />

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this post?"
        message={`The post${deleting && getCommentCount(deleting.id) ? ` and its ${getCommentCount(deleting.id)} comment(s)` : ''} will be removed permanently.`}
        onClose={() => setDeleting(null)}
      >
        {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
        <View style={styles.dialogRow}>
          <AppButton label="Cancel" variant="outline" onPress={() => setDeleting(null)} style={styles.flex} />
          <AppButton label="Delete" variant="danger" loading={busy} onPress={confirmDelete} style={styles.flex} />
        </View>
      </ConfirmDialog>

      {canCompose && (
        <ComposePostSheet
          visible={composer !== null}
          artistName={myName}
          artistAvatar={myAvatar}
          initial={composer && composer !== 'new' ? composer : null}
          onClose={() => setComposer(null)}
          onSubmit={(data) => (composer && composer !== 'new' ? editPost(composer.id, data) : createPost(data))}
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Feed"
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#111216' },
  tabText: { fontSize: 13.5, fontWeight: '700', color: '#4B5563' },
  tabTextActive: { color: '#FFFFFF' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  composerText: { flex: 1, fontSize: 14, color: '#686A70' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#111216', textAlign: 'center' },
  emptyText: { fontSize: 13.5, color: '#686A70', textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24 },
  postText: { fontSize: 14.5, lineHeight: 21, color: '#111216', marginBottom: 12 },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  unavailableText: { fontSize: 13.5, color: '#686A70', fontWeight: '600' },
  deleteError: { color: '#E11D48', fontSize: 13, marginBottom: 10 },
  dialogRow: { flexDirection: 'row', gap: 10 },
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
