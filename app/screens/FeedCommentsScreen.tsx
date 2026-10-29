import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { FEED_COMMENTS } from '../../src/data/musicData';

interface FeedCommentsScreenProps {
  onClose?: () => void;
}

export const FeedCommentsScreen: React.FC<FeedCommentsScreenProps> = ({
  onClose,
}) => {
  const [commentText, setCommentText] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Dimmed Background showing Feed track */}
      <View style={styles.dimmedBackground}>
        <View style={styles.bgHeader}>
          <Text style={styles.bgHeaderTitle}>Feed</Text>
          <Feather name="cast" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.bgPost}>
          <View style={styles.bgAuthorRow}>
            <Image source={IMAGES.feedAvatar1} style={styles.bgAvatar} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.bgAuthorName}>Jessica Gonzalez</Text>
              <Text style={styles.bgTimeAgo}>Posted a track  •  3d</Text>
            </View>
          </View>
          <Image source={IMAGES.feedTrack1} style={styles.bgTrackImage} />
        </View>
        <View style={styles.darkOverlay} />
      </View>

      {/* Bottom Sheet Comments Container */}
      <View style={styles.sheetContainer}>
        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>3 comments</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-down" size={24} color="#686A70" />
          </TouchableOpacity>
        </View>

        {/* Comments Scrollable Area */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsContent}
        >
          {FEED_COMMENTS.map((c, index) => (
            <View key={c.id} style={styles.commentBlock}>
              {/* Main Comment */}
              <View style={styles.commentRow}>
                <Image source={c.userAvatar} style={styles.userAvatar} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentText}>
                    <Text style={styles.userName}>{c.userName} </Text>
                    {c.text}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{c.timeAgo}</Text>
                    <Text style={styles.metaText}>{c.likes} like</Text>
                    <TouchableOpacity>
                      <Text style={styles.replyButtonText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.likeIconBtn}>
                  <Ionicons
                    name="thumbs-up-outline"
                    size={16}
                    color={index === 0 ? '#10C7D5' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>

              {/* Nested Replies */}
              {c.replies &&
                c.replies.map((reply) => (
                  <View key={reply.id} style={styles.replyRow}>
                    <Image source={reply.userAvatar} style={styles.replyAvatar} />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentText}>
                        <Text style={styles.userName}>{reply.userName} </Text>
                        <Text style={styles.mentionText}>@Jason Smith </Text>
                        {reply.text.replace('@Jason Smith ', '')}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{reply.timeAgo}</Text>
                        <Text style={styles.metaText}>{reply.likes} like</Text>
                        <TouchableOpacity>
                          <Text style={styles.replyButtonText}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.likeIconBtn}>
                      <Ionicons name="thumbs-up-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          ))}

          {/* View more replies */}
          <TouchableOpacity style={styles.viewMoreContainer}>
            <Text style={styles.viewMoreText}>View 10 more replies</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Comment Input Footer */}
        <SafeAreaView edges={['bottom']} style={styles.inputFooter}>
          <View style={styles.userInitialsAvatar}>
            <Text style={styles.avatarInitial}>A</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Write a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.emojiBtn}>
              <Ionicons name="happy-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  dimmedBackground: {
    height: '35%',
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  bgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  bgHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bgPost: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  bgAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bgAuthorName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bgTimeAgo: {
    color: '#D1D5DB',
    fontSize: 11,
  },
  bgTrackImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    flex: 1,
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
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111216',
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
  viewMoreContainer: {
    marginLeft: 44,
    marginVertical: 10,
  },
  viewMoreText: {
    color: '#10C7D5',
    fontSize: 12,
    fontWeight: '600',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  userInitialsAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00BDD6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
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
  emojiBtn: {
    padding: 2,
  },
});
