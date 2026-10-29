import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { IMAGES } from '../constants/images';

interface MiniPlayerProps {
  onPress?: () => void;
  onPlayPausePress?: () => void;
  onLikePress?: () => void;
  title?: string;
  artist?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  onPress,
  onPlayPausePress,
  onLikePress,
  title = 'FLOWER',
  artist = 'Me • Jessica Gonzalez',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        source={IMAGES.playlistMiniPlayerEye}
        style={styles.thumbnail}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onLikePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onPlayPausePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="play-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: '#16171B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#25262B',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  artist: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  iconButton: {
    marginLeft: 18,
    padding: 4,
  },
});
