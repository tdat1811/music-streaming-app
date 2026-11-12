import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { CommentItem, getSongsByIds } from '../../src/data/musicData';
import { useAuth } from '../../src/context/AuthContext';
import { ReplyTarget, useFeed } from '../../src/context/FeedContext';
import { toImageSource } from '../../src/utils/imageSource';

const OPEN_DURATION_MS = 280;
const CLOSE_DURATION_MS = 220;
// Bản web không hỗ trợ native driver
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const formatCount = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

interface FeedCommentsScreenProps {
  postId?: string | null;
  onClose?: () => void;
  onRequireLogin?: () => void;
}

export const FeedCommentsScreen: React.FC<FeedCommentsScreenProps> = ({
  postId,
  onClose,
  onRequireLogin,
}) => {
  const { currentUser } = useAuth();
  const { posts, getComments, getCommentCount, addComment, toggleCommentLike, refreshComments } = useFeed();
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const shouldScrollToEnd = useRef(false);
  const { height: screenHeight } = useWindowDimensions();
  const sheetProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sheetProgress, {
      toValue: 1,
      duration: OPEN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [sheetProgress]);

  const handleClose = () => {
    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: CLOSE_DURATION_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished && onClose) onClose();
    });
  };

  const post = posts.find((item) => item.id === postId) ?? posts[0];
  const song = post ? getSongsByIds([post.songId])[0] : undefined;

  // Mở bảng thì tải lại bình luận mới nhất từ máy chủ
  useEffect(() => {
    if (post) refreshComments(post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);
  const canSend = commentText.trim() !== '';

  const handleLikeComment = (commentId: string) => {
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    toggleCommentLike(commentId);
  };

  const handleReply = (rootCommentId: string, userName: string) => {
    setReplyTarget({ rootCommentId, userName });
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!canSend) return;
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    // Bình luận gốc nằm cuối danh sách, câu trả lời nằm ngay dưới bình luận đang xem
    shouldScrollToEnd.current = !replyTarget;
    addComment(post.id, commentText, replyTarget);
    setCommentText('');
    setReplyTarget(null);
  };

  const renderComment = (comment: CommentItem, rootCommentId: string) => {
    const isReply = comment.id !== rootCommentId;
    const isLiked = !!currentUser && comment.likedByUserIds.includes(currentUser.id);
    return (
      <View key={comment.id} style={isReply ? styles.replyRow : styles.commentRow}>
        <Image
          source={toImageSource(comment.userAvatar, IMAGES.homeAvatar)}
          style={isReply ? styles.replyAvatar : styles.userAvatar}
        />
        <View style={styles.commentBody}>
          <Text style={styles.commentText}>
            <Text style={styles.userName}>{comment.userName} </Text>
            {!!comment.replyToName && (
              <Text style={styles.mentionText}>@{comment.replyToName} </Text>
            )}
            {comment.text}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{comment.timeAgo}</Text>
            <Text style={styles.metaText}>{formatCount(comment.likes, 'like')}</Text>
            <TouchableOpacity onPress={() => handleReply(rootCommentId, comment.userName)}>
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.likeIconBtn} onPress={() => handleLikeComment(comment.id)}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isLiked ? COLORS.primary : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.overlay}>
      <StatusBar style="light" />

      {/* Dimmed backdrop over the real screen */}
      <Animated.View style={[styles.backdrop, { opacity: sheetProgress }]} />

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Pressable
          style={styles.backdropArea}
          onPress={handleClose}
          accessibilityLabel="Close comments"
        />

      {/* Bottom Sheet Comments Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [
              {
                translateY: sheetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenHeight, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeading}>
            <Text style={styles.sheetTitle}>{formatCount(getCommentCount(post.id), 'comment')}</Text>
            <Text style={styles.sheetSubtitle} numberOfLines={1}>
              {song ? `${song.title} • ${song.artist}` : post.authorName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-down" size={24} color="#686A70" />
          </TouchableOpacity>
        </View>

        {/* Comments Scrollable Area */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (shouldScrollToEnd.current) {
              shouldScrollToEnd.current = false;
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          {getComments(post.id).map((comment) => (
            <View key={comment.id} style={styles.commentBlock}>
              {renderComment(comment, comment.id)}
              {comment.replies?.map((reply) => renderComment(reply, comment.id))}
            </View>
          ))}
        </ScrollView>

        {/* Comment Input Footer */}
        <SafeAreaView edges={['bottom']} style={styles.inputFooter}>
          {replyTarget && (
            <View style={styles.replyingRow}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {replyTarget.userName}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyTarget(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color="#686A70" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            {currentUser ? (
              <Image source={IMAGES.homeAvatar} style={styles.footerAvatar} />
            ) : (
              <View style={styles.guestAvatar}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Write a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                disabled={!canSend}
                accessibilityLabel="Send comment"
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={canSend ? COLORS.primary : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flex: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropArea: {
    flex: 32,
  },
  sheetContainer: {
    flex: 68,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetHeading: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111216',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#686A70',
    marginTop: 2,
  },
  commentsContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  commentBlock: {
    marginBottom: 16,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  commentBody: {
    flex: 1,
    marginLeft: 12,
  },
  commentText: {
    fontSize: 13,
    color: '#111216',
    lineHeight: 18,
  },
  userName: {
    fontWeight: '700',
  },
  mentionText: {
    color: '#0284C7',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  replyButtonText: {
    fontSize: 11,
    color: '#686A70',
    fontWeight: '600',
  },
  likeIconBtn: {
    padding: 6,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 44,
    marginTop: 12,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 2,
  },
  inputFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  replyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  replyingText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#686A70',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  guestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 22,
    marginLeft: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111216',
    paddingVertical: 0,
  },
  sendBtn: {
    padding: 2,
    marginLeft: 8,
  },
});
