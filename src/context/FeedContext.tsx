import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { IMAGES } from '../constants/images';
import { CommentItem, FEED_COMMENTS, FEED_POSTS, FeedPost } from '../data/musicData';
import { api, isApiError } from '../services/api';
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
  // Tải lại bình luận mới nhất của một bài đăng từ máy chủ
  refreshComments: (postId: string) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

// Áp dụng like/unlike của một user lên post hoặc bình luận
const toggleLike = <T extends { likes: number; likedByUserIds: string[] }>(item: T, userId: string): T =>
  item.likedByUserIds.includes(userId)
    ? {
        ...item,
        likes: Math.max(0, item.likes - 1),
        likedByUserIds: item.likedByUserIds.filter((id) => id !== userId),
      }
    : { ...item, likes: item.likes + 1, likedByUserIds: [...item.likedByUserIds, userId] };

const mapPost = (p: any): FeedPost => ({
  id: p.id,
  authorName: p.authorName,
  authorAvatar: p.authorAvatar,
  timeAgo: p.timeAgo,
  songId: p.songId,
  likes: p.likes ?? 0,
  likedByUserIds: p.likedByUserIds ?? [],
  shares: p.shares ?? 0,
});

const mapComment = (c: any): CommentItem => ({
  id: c.id,
  postId: c.postId,
  userName: c.userName,
  userAvatar: c.userAvatar,
  text: c.text,
  timeAgo: c.timeAgo,
  likes: c.likes ?? 0,
  likedByUserIds: c.likedByUserIds ?? [],
  replyToName: c.replyToName || undefined,
  replies: (c.replies ?? []).map(mapComment),
});

// Dữ liệu được tải từ máy chủ khi mở app. Nếu máy chủ không chạy thì dùng dữ liệu mẫu
// và mọi thay đổi chỉ lưu trong bộ nhớ của ứng dụng.
export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>(FEED_POSTS);
  const [comments, setComments] = useState<CommentItem[]>(FEED_COMMENTS);
  const nextCommentNumber = useRef(1);
  // Đã tải được bảng tin từ máy chủ: các thao tác sẽ được ghi lên máy chủ
  const online = useRef(false);

  const replacePostComments = (postId: string, list: CommentItem[]) =>
    setComments((prev) => [...prev.filter((c) => c.postId !== postId), ...list]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await api.feed.getPosts();
        const list: any[] = res?.data ?? [];
        if (!mounted || list.length === 0) return;
        online.current = true;
        setPosts(list.map(mapPost));
        const all = await Promise.all(
          list.map((p) =>
            api.feed
              .getComments(p.id)
              .then((r: any) => (r?.data ?? []).map(mapComment))
              .catch(() => [] as CommentItem[])
          )
        );
        if (mounted) setComments(all.flat());
      } catch (err) {
        console.log('Feed offline, dùng dữ liệu mẫu:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshComments = (postId: string) => {
    if (!online.current) return;
    api.feed
      .getComments(postId)
      .then((r: any) => replacePostComments(postId, (r?.data ?? []).map(mapComment)))
      .catch(() => {});
  };

  const updatePost = (postId: string, change: (post: FeedPost) => FeedPost) =>
    setPosts((prev) => prev.map((post) => (post.id === postId ? change(post) : post)));

  const togglePostLike = (postId: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const flip = () => updatePost(postId, (post) => toggleLike(post, userId));
    flip();
    if (!online.current) return;
    api.feed
      .togglePostLike(postId, userId)
      .then((r: any) =>
        // Lấy số liệu chính xác từ máy chủ (có thể đã có người khác thích)
        updatePost(postId, (post) => ({
          ...post,
          likes: r?.likes ?? post.likes,
          likedByUserIds: r?.likedByUserIds ?? post.likedByUserIds,
        }))
      )
      .catch((err) => {
        if (isApiError(err)) flip();
      });
  };

  const addShare = (postId: string) => {
    updatePost(postId, (post) => ({ ...post, shares: post.shares + 1 }));
    if (!online.current) return;
    api.feed
      .sharePost(postId)
      .then((r: any) => updatePost(postId, (post) => ({ ...post, shares: r?.shares ?? post.shares })))
      .catch((err) => {
        if (isApiError(err)) updatePost(postId, (post) => ({ ...post, shares: Math.max(0, post.shares - 1) }));
      });
  };

  const getComments = (postId: string) => comments.filter((comment) => comment.postId === postId);

  // Tính cả các câu trả lời
  const getCommentCount = (postId: string) =>
    getComments(postId).reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);

  const addLocalComment = (postId: string, text: string, replyTarget?: ReplyTarget | null) => {
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

  const addComment = (postId: string, text: string, replyTarget?: ReplyTarget | null) => {
    if (!currentUser) return;
    if (!online.current) {
      addLocalComment(postId, text, replyTarget);
      return;
    }
    api.feed
      .addComment({
        postId,
        userName: currentUser.name,
        userAvatar: '',
        text,
        replyTarget: replyTarget ?? undefined,
      })
      .then((r: any) => {
        if (!r?.data) return;
        const saved = mapComment(r.data);
        // Trả lời: máy chủ trả về bình luận gốc kèm câu trả lời mới; bình luận gốc mới thì thêm vào cuối
        setComments((prev) =>
          replyTarget ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
        );
      })
      .catch((err) => {
        if (isApiError(err)) {
          console.log('Không gửi được bình luận:', err.message);
          return;
        }
        addLocalComment(postId, text, replyTarget);
      });
  };

  const toggleCommentLike = (commentId: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const updateComment = (comment: CommentItem): CommentItem => {
      const updated = comment.id === commentId ? toggleLike(comment, userId) : comment;
      return updated.replies ? { ...updated, replies: updated.replies.map(updateComment) } : updated;
    };
    const flip = () => setComments((prev) => prev.map(updateComment));
    flip();
    if (!online.current) return;
    api.feed.toggleCommentLike(commentId, userId).catch((err) => {
      if (isApiError(err)) flip();
    });
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
        refreshComments,
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
