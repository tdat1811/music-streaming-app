import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { AppNotification, useNotifications } from '../../src/context/NotificationContext';
import { useRefreshControl } from '../../src/context/RefreshContext';
import { RefreshButton } from '../../src/components/RefreshButton';
import { removalNoticeLines, ruleLabel } from '../../src/utils/moderation';

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

  // Thông báo kết quả đăng ký nghệ sĩ (được duyệt / cần sửa)
  const renderArtistResult = (item: AppNotification) => {
    const approved = item.type === 'artist_request_approved';
    return (
      <TouchableOpacity
        style={[styles.row, !item.read && styles.rowUnread]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${approved ? 'Artist request approved' : 'Artist request needs changes'}${item.read ? '' : ', unread'}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: approved ? '#16A34A' : '#E11D48' }]}>
          <Ionicons name={approved ? 'checkmark' : 'close'} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.body}>
          {approved ? (
            <Text style={styles.message}>
              <Text style={styles.actor}>You're now an artist! 🎉</Text> Your request for <Text style={styles.actor}>{item.text}</Text> was approved. Open Artist Studio to set up your page.
            </Text>
          ) : (
            <Text style={styles.message}>
              <Text style={styles.actor}>Your artist request needs changes.</Text> Reason: {item.text}. Tap to see details.
            </Text>
          )}
          <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Thông báo từ nghệ sĩ mình theo dõi: đăng bài mới / ra bài hát mới
  const renderFromArtist = (item: AppNotification) => {
    const isSong = item.type === 'artist_new_song';
    const label = isSong ? 'released a new song' : 'posted on the Feed';
    return (
      <TouchableOpacity
        style={[styles.row, !item.read && styles.rowUnread]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.actorName} ${label}${item.read ? '' : ', unread'}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: isSong ? '#7B2CBF' : '#0EA5B5' }]}>
          <Ionicons name={isSong ? 'musical-notes' : 'megaphone'} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.body}>
          <Text style={styles.message}>
            <Text style={styles.actor}>{item.actorName}</Text> {label}
            {isSong && !!item.text && <Text style={styles.actor}>: {item.text}</Text>}
          </Text>
          {!isSong && !!item.text && (
            <Text style={styles.preview} numberOfLines={2}>
              "{item.text}"
            </Text>
          )}
          <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Giai đoạn 5: nội dung của mình bị gỡ vì vi phạm / trang nghệ sĩ bị ẩn hoặc hiện lại
  const renderModeration = (item: AppNotification) => {
    if (item.type === 'content_removed') {
      const l = removalNoticeLines(item);
      return (
        <TouchableOpacity
          style={[styles.row, !item.read && styles.rowAlert]}
          onPress={() => handleOpen(item)}
          activeOpacity={0.7}
          accessibilityLabel={`${l.title}${item.read ? '' : ', unread'}`}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#E11D48' }]}>
            <Ionicons name="shield-outline" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.body}>
            <Text style={styles.message}>
              <Text style={styles.actor}>{l.title}</Text> {l.body}
            </Text>
            {!!item.text && (
              <Text style={styles.removedQuote} numberOfLines={2}>"{item.text}"</Text>
            )}
            <Text style={[styles.strike, l.severe && styles.strikeSevere]}>{l.warning}</Text>
            <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      );
    }
    const hidden = item.type === 'artist_page_hidden';
    return (
      <TouchableOpacity
        style={[styles.row, !item.read && (hidden ? styles.rowAlert : styles.rowUnread)]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${hidden ? 'Your artist page was hidden' : 'Your artist page is visible again'}${item.read ? '' : ', unread'}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: hidden ? '#E11D48' : '#16A34A' }]}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.body}>
          <Text style={styles.message}>
            {hidden ? (
              <>
                <Text style={styles.actor}>Your artist page was hidden</Text> by a moderator ({ruleLabel(item.rule)}). Listeners can't see your page, songs or posts.
              </>
            ) : (
              <>
                <Text style={styles.actor}>Your artist page is visible again.</Text> Listeners can find your songs and posts.
              </>
            )}
          </Text>
          <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) =>
    item.type === 'content_removed' || item.type === 'artist_page_hidden' || item.type === 'artist_page_restored' ? renderModeration(item) :
    item.type === 'artist_new_post' || item.type === 'artist_new_song' ? renderFromArtist(item) :
    item.type !== 'comment_reply' ? renderArtistResult(item) : (
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
  rowAlert: { backgroundColor: '#FFF5F6' },
  removedQuote: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#111216', marginTop: 6 },
  strike: { fontSize: 12.5, color: '#686A70', marginTop: 6, fontWeight: '700' },
  strikeSevere: { color: '#9F1239' },
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
