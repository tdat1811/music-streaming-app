import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { AppNotification, useNotifications } from '../../src/context/NotificationContext';
import { useRefreshControl } from '../../src/context/RefreshContext';
import { RefreshButton } from '../../src/components/RefreshButton';

interface NotificationsScreenProps {
  onBack?: () => void;
  // Mở màn phát bài hát của bài đăng + bảng bình luận, nháy sáng chỗ được trả lời
  onOpenNotification?: (notification: AppNotification) => void;
}

const formatTimeAgo = (iso: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seconds) || seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack, onOpenNotification }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const refreshControl = useRefreshControl();

  const handleOpen = (item: AppNotification) => {
    markRead(item.id);
    if (onOpenNotification) onOpenNotification(item);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => handleOpen(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${item.actorName} replied to your comment${item.read ? '' : ', unread'}`}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.body}>
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actorName}</Text> replied to your comment
        </Text>
        {!!item.text && (
          <Text style={styles.preview} numberOfLines={2}>
            "{item.text}"
          </Text>
        )}
        <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerIconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          <RefreshButton />
          <TouchableOpacity
            onPress={markAllRead}
            disabled={unreadCount === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.markAll, unreadCount === 0 && styles.markAllDisabled]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={refreshControl}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              No notifications yet. You will be notified when someone replies to your comments.
            </Text>
          </View>
        }
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIconBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#111216',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  markAll: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  markAllDisabled: {
    color: COLORS.textMuted,
  },
  listContent: {
    paddingBottom: 90,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowUnread: {
    backgroundColor: '#ECFEFF',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10C7D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  message: {
    fontSize: 14,
    color: '#111216',
    lineHeight: 19,
  },
  actor: {
    fontWeight: '700',
  },
  preview: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 3,
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginTop: 6,
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
