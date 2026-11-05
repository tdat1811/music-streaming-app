import React, { createContext, useContext, useRef, useState } from 'react';
import { IMAGES } from '../constants/images';
import { CommentItem, FEED_COMMENTS, FEED_POSTS, FeedPost } from '../data/musicData';
import { useAuth } from './AuthContext';

export interface ReplyTarget {
  rootCommentId: string;
  userName: string;
}

interface FeedContextType {
  posts: FeedPost[];
  togglePostLike: (postId: string) => void;
  addShare: (postId: string) => void;
  getComments: (postId: string) => CommentItem[];
  getCommentCount: (postId: string) => number;
  addComment: (postId: string, text: string, replyTarget?: ReplyTarget | null) => void;
  toggleCommentLike: (commentId: string) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

// Áp dụng like/unlike của một user lên post hoặc bình luận
const toggleLike = <T extends { likes: number; likedByUserIds: string[] }>(item: T, userId: string): T =>
  item.likedByUserIds.includes(userId)
    ? {
        ...item,
        likes: item.likes - 1,
        likedByUserIds: item.likedByUserIds.filter((id) => id !== userId),
      }
    : { ...item, likes: item.likes + 1, likedByUserIds: [...item.likedByUserIds, userId] };

// Dữ liệu bắt đầu từ file mẫu, mọi thay đổi chỉ lưu trong bộ nhớ
export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>(FEED_POSTS);
  const [comments, setComments] = useState<CommentItem[]>(FEED_COMMENTS);
  const nextCommentNumber = useRef(1);

  const togglePostLike = (postId: string) => {
    if (!currentUser) return;
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? toggleLike(post, currentUser.id) : post))
    );
  };

  const addShare = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, shares: post.shares + 1 } : post))
    );
  };

  const getComments = (postId: string) => comments.filter((comment) => comment.postId === postId);

  // Tính cả các câu trả lời
  const getCommentCount = (postId: string) =>
    getComments(postId).reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);

  const addComment = (postId: string, text: string, replyTarget?: ReplyTarget | null) => {
    if (!currentUser) return;
    const newComment: CommentItem = {
      id: `new-${nextCommentNumber.current++}`,
      postId,
      userName: currentUser.name,
      userAvatar: IMAGES.homeAvatar,
      text: text.trim(),
      timeAgo: 'now',
      likes: 0,
      likedByUserIds: [],
      replyToName: replyTarget?.userName,
    };
    setComments((prev) =>
      replyTarget
        ? prev.map((comment) =>
            comment.id === replyTarget.rootCommentId
              ? { ...comment, replies: [...(comment.replies ?? []), newComment] }
              : comment
          )
        : [...prev, newComment]
    );
  };

  const toggleCommentLike = (commentId: string) => {
    if (!currentUser) return;
    const updateComment = (comment: CommentItem): CommentItem => {
      const updated = comment.id === commentId ? toggleLike(comment, currentUser.id) : comment;
      return updated.replies ? { ...updated, replies: updated.replies.map(updateComment) } : updated;
    };
    setComments((prev) => prev.map(updateComment));
  };

  return (
    <FeedContext.Provider
      value={{
        posts,
        togglePostLike,
        addShare,
        getComments,
        getCommentCount,
        addComment,
        toggleCommentLike,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed phải nằm trong FeedProvider');
  }
  return context;
};
