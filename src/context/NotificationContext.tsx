import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, isApiError } from '../services/api';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  // Người nhận
  userId: string;
  type: 'comment_reply';
  actorName: string;
  postId: string;
  // Bình luận gốc (thread) và câu trả lời mới
  commentId: string;
  // Bình luận được trả lời (của người nhận) — nơi nháy sáng khi mở thông báo
  targetCommentId: string;
  replyId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  // Chế độ offline (máy chủ tắt): tạo thông báo ngay trong bộ nhớ của ứng dụng
  addLocalNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Kiểm tra thông báo mới định kỳ khi đang đăng nhập
const POLL_INTERVAL_MS = 30000;

const mapNotification = (n: any): AppNotification => ({
  id: n.id,
  userId: n.userId,
  type: n.type || 'comment_reply',
  actorName: n.actorName || 'Someone',
  postId: n.postId,
  commentId: n.commentId || '',
  targetCommentId: n.targetCommentId || n.commentId || '',
  replyId: n.replyId || '',
  text: n.text || '',
  read: !!n.read,
  createdAt: n.createdAt || new Date().toISOString(),
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? null;
  // Thông báo lấy từ máy chủ cho tài khoản hiện tại; null = chưa lấy được (offline)
  const [serverNotifications, setServerNotifications] = useState<AppNotification[] | null>(null);
  // Thông báo tạo trên máy khi offline, cho mọi tài khoản (lọc theo người nhận khi hiển thị)
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const nextLocalId = useRef(1);

  const refreshNotifications = useCallback(async () => {
    const requestedFor = userIdRef.current;
    if (!requestedFor) {
      setServerNotifications(null);
      return;
    }
    try {
      const res: any = await api.notifications.getMine();
      // Bỏ kết quả nếu người dùng đã đăng xuất / đổi tài khoản trong lúc chờ
      if (userIdRef.current !== requestedFor) return;
      setServerNotifications((res?.data ?? []).map(mapNotification));
    } catch (err) {
      if (userIdRef.current !== requestedFor) return;
      // Máy chủ tắt hoặc phiên offline: dùng thông báo trên máy
      if (!isApiError(err)) setServerNotifications(null);
    }
  }, []);

  // Đổi tài khoản thì tải lại, và kiểm tra định kỳ khi đang đăng nhập
  useEffect(() => {
    setServerNotifications(null);
    if (!userId) return;
    refreshNotifications();
    const timer = setInterval(refreshNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [userId, refreshNotifications]);

  const notifications = serverNotifications ??
    localNotifications.filter((n) => n.userId === userId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const setRead = (ids: string[] | 'all') => {
    const apply = (list: AppNotification[]) =>
      list.map((n) =>
        (ids === 'all' ? n.userId === userId : ids.includes(n.id)) ? { ...n, read: true } : n
      );
    if (serverNotifications) setServerNotifications((prev) => (prev ? apply(prev) : prev));
    else setLocalNotifications(apply);
  };

  const markRead = (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.read) return;
    setRead([notificationId]);
    if (serverNotifications) {
      api.notifications.markRead(notificationId).catch((err) => console.log('Không đánh dấu đã đọc được:', err));
    }
  };

  const markAllRead = () => {
    if (unreadCount === 0) return;
    setRead('all');
    if (serverNotifications) {
      api.notifications.markAllRead().catch((err) => console.log('Không đánh dấu đã đọc được:', err));
    }
  };

  const addLocalNotification: NotificationContextType['addLocalNotification'] = (notification) => {
    setLocalNotifications((prev) => [
      {
        ...notification,
        id: `local-n${nextLocalId.current++}`,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markRead,
        markAllRead,
        addLocalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications phải nằm trong NotificationProvider');
  }
  return context;
};
