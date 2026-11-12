import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Share,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Song } from '../data/musicData';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';

interface AlbumActionModalProps {
  visible: boolean;
  title: string;
  description: string;
  coverImage: any;
  tracks: Song[];
  isLiked?: boolean;
  onToggleLike?: () => void;
  onClose: () => void;
}

export const AlbumActionModal: React.FC<AlbumActionModalProps> = ({
  visible,
  title,
  description,
  coverImage,
  tracks,
  isLiked = false,
  onToggleLike,
  onClose,
}) => {
  const { currentUser, isVip, userPlaylists, addSongToPlaylist, downloadAllSongs } = useAuth();
  const { ensureMember, ensureVip } = useAccess();
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const handleClose = () => {
    setShowPlaylistPicker(false);
    onClose();
  };

  const handleOpenPlaylistPicker = () => {
    if (!currentUser) {
      handleClose();
      ensureMember();
      return;
    }
    setShowPlaylistPicker(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Nghe "${title}" trên Soundwave! ${description}`,
      });
    } catch {}
    handleClose();
  };

  const handleDownloadAll = () => {
    if (!isVip) {
      handleClose();
      ensureVip('Tải album nghe ngoại tuyến');
      return;
    }
    if (tracks.length === 0) {
      Alert.alert('Thông báo', 'Danh sách này chưa có bài hát nào để tải.');
      return;
    }
    const songIds = tracks.map((t) => t.id);
    downloadAllSongs(songIds);
    Alert.alert(
      'Tải xuống thành công',
      `Đã tải ${tracks.length} bài hát của "${title}" về máy để nghe ngoại tuyến!`
    );
    handleClose();
  };

  const handleAddAllToPlaylist = (playlistId: string, playlistTitle: string) => {
    let count = 0;
    tracks.forEach((track) => {
      if (addSongToPlaylist(playlistId, track.id)) {
        count++;
      }
    });
    Alert.alert(
      'Thành công',
      count > 0
        ? `Đã thêm ${count} bài hát vào playlist "${playlistTitle}"!`
        : `Tất cả bài hát đã có sẵn trong playlist "${playlistTitle}".`
    );
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.dragIndicator} />

              {/* Album Header */}
              <View style={styles.albumHeader}>
                <Image source={coverImage} style={styles.coverImage} />
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.albumDesc} numberOfLines={2}>
                    {description}
                  </Text>
                  <Text style={styles.albumTrackCount}>
                    {tracks.length} bài hát
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {showPlaylistPicker ? (
                /* Playlist Picker View */
                <View style={styles.playlistPickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowPlaylistPicker(false)}
                      style={styles.backBtn}
                    >
                      <Feather name="chevron-left" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Thêm vào Playlist</Text>
                  </View>

                  <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
                    {userPlaylists.length === 0 ? (
                      <Text style={styles.emptyPlaylistText}>
                        Bạn chưa có playlist cá nhân nào. Hãy tạo playlist mới trong Thư viện!
                      </Text>
                    ) : (
                      userPlaylists.map((pl) => (
                        <TouchableOpacity
                          key={pl.id}
                          style={styles.playlistItem}
                          onPress={() => handleAddAllToPlaylist(pl.id, pl.title)}
                        >
                          <Image source={pl.coverImage} style={styles.playlistThumb} />
                          <View style={styles.playlistInfo}>
                            <Text style={styles.playlistItemTitle} numberOfLines={1}>
                              {pl.title}
                            </Text>
                            <Text style={styles.playlistItemCount}>
                              {pl.songIds.length} bài hát
                            </Text>
                          </View>
                          <Feather name="plus-circle" size={20} color="#10C7D5" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              ) : (
                /* Menu Options View */
                <View style={styles.menuOptions}>
                  {/* Option 1: Like/Unlike */}
                  {onToggleLike && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onToggleLike();
                        handleClose();
                      }}
                    >
                      <View style={styles.iconWrapper}>
                        <Ionicons
                          name={isLiked ? 'heart' : 'heart-outline'}
                          size={24}
                          color={isLiked ? '#10C7D5' : '#111216'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.menuItemText,
                          isLiked && { color: '#10C7D5', fontWeight: '700' },
                        ]}
                      >
                        {isLiked ? 'Đã yêu thích (Thả tim)' : 'Thêm vào mục Yêu thích (Thả tim)'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Option 2: Thêm tất cả vào playlist */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleOpenPlaylistPicker}
                  >
                    <View style={styles.iconWrapper}>
                      <MaterialCommunityIcons name="playlist-plus" size={24} color="#111216" />
                    </View>
                    <Text style={styles.menuItemText}>Thêm tất cả vào Playlist</Text>
                    <Feather name="chevron-right" size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Option 3: Tải xuống tất cả */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleDownloadAll}>
                    <View style={styles.iconWrapper}>
                      <Ionicons name="arrow-down-circle-outline" size={24} color="#111216" />
                    </View>
                    <Text style={styles.menuItemText}>Tải toàn bộ album về máy (Offline)</Text>
                  </TouchableOpacity>

                  {/* Option 4: Chia sẻ */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                    <View style={styles.iconWrapper}>
                      <Feather name="share-2" size={22} color="#111216" />
                    </View>
                    <Text style={styles.menuItemText}>Chia sẻ album / danh sách</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coverImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  albumInfo: {
    flex: 1,
    marginLeft: 14,
  },
  albumTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 2,
  },
  albumDesc: {
    fontSize: 13,
    color: '#686A70',
    marginBottom: 4,
  },
  albumTrackCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10C7D5',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  menuOptions: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconWrapper: {
    width: 32,
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  playlistPickerContainer: {
    paddingVertical: 4,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111216',
  },
  playlistList: {
    maxHeight: 220,
  },
  emptyPlaylistText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  playlistThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111216',
    marginBottom: 2,
  },
  playlistItemCount: {
    fontSize: 13,
    color: '#686A70',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
});
