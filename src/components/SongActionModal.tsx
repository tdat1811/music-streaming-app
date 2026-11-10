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

interface SongActionModalProps {
  visible: boolean;
  song: Song | null;
  onClose: () => void;
}

export const SongActionModal: React.FC<SongActionModalProps> = ({
  visible,
  song,
  onClose,
}) => {
  const {
    currentUser,
    userPlaylists,
    addSongToPlaylist,
    toggleLikeSong,
    downloadSong,
    isSongDownloaded,
  } = useAuth();

  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  if (!song) return null;

  const isLiked = !!currentUser?.likedSongIds.includes(song.id);
  const isDownloaded = isSongDownloaded(song.id);

  const handleClose = () => {
    setShowPlaylistPicker(false);
    onClose();
  };

  const handleToggleLike = () => {
    toggleLikeSong(song.id);
    Alert.alert(
      'Yêu thích',
      !isLiked
        ? `Đã thêm "${song.title}" vào danh sách bài hát yêu thích!`
        : `Đã xóa "${song.title}" khỏi bài hát yêu thích.`
    );
    handleClose();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Nghe bài hát "${song.title}" của ${song.artist} trên Soundwave!`,
      });
    } catch {}
    handleClose();
  };

  const handleDownload = () => {
    if (isDownloaded) {
      Alert.alert('Tải xuống', `Bài hát "${song.title}" đã có sẵn trong bộ nhớ ngoại tuyến của bạn.`);
    } else {
      downloadSong(song.id);
      Alert.alert(
        'Tải xuống thành công',
        `Đã tải bài hát "${song.title}" về máy để nghe nhạc ngoại tuyến!`
      );
    }
    handleClose();
  };

  const handleSelectPlaylist = (playlistId: string, playlistTitle: string) => {
    const success = addSongToPlaylist(playlistId, song.id);
    if (success) {
      Alert.alert('Thành công', `Đã thêm "${song.title}" vào playlist "${playlistTitle}"!`);
    } else {
      Alert.alert('Thông báo', `Bài hát "${song.title}" đã có sẵn trong playlist "${playlistTitle}".`);
    }
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

              {/* Song Header */}
              <View style={styles.songHeader}>
                <Image source={song.coverImage} style={styles.coverImage} />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist}
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
                    <Text style={styles.pickerTitle}>Chọn Playlist</Text>
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
                          onPress={() => handleSelectPlaylist(pl.id, pl.title)}
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
                  {/* Option 1: Thêm vào playlist */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowPlaylistPicker(true)}
                  >
                    <View style={styles.iconWrapper}>
                      <MaterialCommunityIcons name="playlist-plus" size={24} color="#111216" />
                    </View>
                    <Text style={styles.menuItemText}>Thêm vào playlist</Text>
                    <Feather name="chevron-right" size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Option 2: Yêu thích */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleToggleLike}>
                    <View style={styles.iconWrapper}>
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isLiked ? '#10C7D5' : '#111216'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuItemText,
                        isLiked && { color: '#10C7D5', fontWeight: '700' },
                      ]}
                    >
                      {isLiked ? 'Đã thích bài hát này' : 'Yêu thích bài hát (Thả tim)'}
                    </Text>
                  </TouchableOpacity>

                  {/* Option 3: Tải xuống */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleDownload}>
                    <View style={styles.iconWrapper}>
                      <Ionicons
                        name={isDownloaded ? 'cloud-done' : 'arrow-down-circle-outline'}
                        size={22}
                        color={isDownloaded ? '#10C7D5' : '#111216'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuItemText,
                        isDownloaded && { color: '#10C7D5', fontWeight: '700' },
                      ]}
                    >
                      {isDownloaded ? 'Đã tải xuống ngoại tuyến' : 'Tải bài hát về máy (Offline)'}
                    </Text>
                  </TouchableOpacity>

                  {/* Option 4: Chia sẻ */}
                  <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                    <View style={styles.iconWrapper}>
                      <Feather name="share-2" size={20} color="#111216" />
                    </View>
                    <Text style={styles.menuItemText}>Chia sẻ bài hát</Text>
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
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  coverImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  songInfo: {
    flex: 1,
    marginLeft: 14,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#686A70',
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
