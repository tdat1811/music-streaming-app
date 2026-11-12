import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Song } from '../data/musicData';

interface SongItemProps {
  song: Song & { isPlaylist?: boolean; songCount?: number };
  rightAction?: 'dots' | 'heart' | 'chevron';
  // Thứ hạng hiển thị bên trái (dùng trong chi tiết bảng xếp hạng)
  rank?: number;
  onPress?: () => void;
  onRightActionPress?: () => void;
}

export const SongItem: React.FC<SongItemProps> = memo(({
  song,
  rightAction = 'dots',
  rank,
  onPress,
  onRightActionPress,
}) => {
  const imageSource = typeof song.coverImage === 'string' ? { uri: song.coverImage } : song.coverImage;
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {rank !== undefined && (
        <Text
          style={[styles.rank, rank <= 3 && styles.rankTop]}
          accessibilityLabel={`Rank ${rank}`}
        >
          {rank}
        </Text>
      )}
      <Image source={imageSource} style={styles.coverImage} fadeDuration={0} />

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.isPlaylist
            ? `${song.artist}  •  ${song.songCount} songs`
            : song.artist}
        </Text>
        {!song.isPlaylist && (song.plays || song.duration) && (
          <View style={styles.metaRow}>
            <Ionicons name="play" size={10} color={COLORS.textMuted} style={styles.playIcon} />
            {song.plays && <Text style={styles.metaText}>{song.plays}</Text>}
            {song.plays && song.duration && <Text style={styles.dot}>•</Text>}
            {song.duration && <Text style={styles.metaText}>{song.duration}</Text>}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onRightActionPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={rightAction === 'dots' ? 'Song options' : undefined}
      >
        {rightAction === 'heart' ? (
          <Ionicons
            name={song.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={song.isLiked ? COLORS.primary : COLORS.textMuted}
          />
        ) : rightAction === 'chevron' ? (
          <Feather name="chevron-right" size={20} color={COLORS.textPrimary} />
        ) : (
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={22}
            color={COLORS.textPrimary}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rank: {
    width: 28,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  rankTop: {
    color: '#10C7D5',
    fontSize: 18,
  },
  coverImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  dot: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  actionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
