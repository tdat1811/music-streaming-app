import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform, RefreshControl } from 'react-native';
import { useAuth } from './AuthContext';
import { useFeed } from './FeedContext';
import { useNotifications } from './NotificationContext';

interface RefreshContextType {
  refreshing: boolean;
  // Tăng sau mỗi lần làm mới; Navigation dùng làm key để dựng lại màn hình (các màn tự tải lại dữ liệu)
  refreshKey: number;
  refreshApp: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// Làm mới toàn bộ ứng dụng mà không mất phiên đăng nhập và bài đang phát:
// tải lại tài khoản + playlist, bảng tin + bình luận, thông báo, rồi dựng lại màn hình hiện tại.
export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reloadAccount } = useAuth();
  const { reloadFeed } = useFeed();
  const { refreshNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const inFlight = useRef(false);

  // Giữ hàm mới nhất để refreshApp không đổi giữa các lần render
  const loaders = useRef({ reloadAccount, reloadFeed, refreshNotifications });
  loaders.current = { reloadAccount, reloadFeed, refreshNotifications };

  const refreshApp = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const { reloadAccount: account, reloadFeed: feed, refreshNotifications: notify } = loaders.current;
      await Promise.allSettled([account(), feed(), notify()]);
    } finally {
      setRefreshKey((key) => key + 1);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshing, refreshKey, refreshApp }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useAppRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useAppRefresh phải nằm trong RefreshProvider');
  }
  return context;
};

// Kéo xuống để làm mới (pull-to-refresh) cho ScrollView / FlatList trên điện thoại.
// Bản web không hỗ trợ kéo để làm mới nên dùng nút RefreshButton ở header.
export const useRefreshControl = () => {
  const { refreshing, refreshApp } = useAppRefresh();
  if (Platform.OS === 'web') return undefined;
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refreshApp}
      tintColor="#10C7D5"
      colors={['#10C7D5']}
    />
  );
};
