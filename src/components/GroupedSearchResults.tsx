import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Album, Artist, Song } from '../data/musicData';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { toImageSource } from '../utils/imageSource';
import { SongItem } from './SongItem';
import { SongActionModal } from './SongActionModal';

interface GroupedSearchResultsProps {
  query: string;
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  // Tiêu đề từng nhóm (Library: "Liked songs"..., Home: "Songs"...)
  labels?: { songs: string; albums: string; artists: string };
  emptyText?: string;
  // 'dots' mở menu thao tác bài hát, 'heart' bỏ thích ngay (Library)
  songAction?: 'dots' | 'heart';
  onToggleLikeSong?: (songId: string) => void;
  onPressSong: (song: Song, queue: Song[]) => void;
  onSelectAlbum?: (album: Album) => void;
  onSelectArtist?: (artist: Artist) => void;
}

const DEFAULT_LABELS = { songs: 'Songs', albums: 'Albums', artists: 'Artists' };

// Kết quả tìm kiếm tương đối chia nhóm Songs / Albums / Artists, dùng chung cho Home và Library.
// Không tự cuộn: đặt bên trong ScrollView của màn hình.
export const GroupedSearchResults: React.FC<GroupedSearchResultsProps> = ({
  query,
  songs,
  albums,
  artists,
  labels = DEFAULT_LABELS,
  emptyText,
  songAction = 'dots',
  onToggleLikeSong,
  onPressSong,
  onSelectAlbum,
  onSelectArtist,
}) => {
  const { currentUser, toggleFollowArtist } = useAuth();
  const { ensureMember } = useAccess();
  const [menuSong, setMenuSong] = useState<Song | null>(null);

  const total = songs.length + albums.length + artists.length;

  return (
    <View>
      {total === 0 && (
        <Text style={styles.emptyText}>{emptyText ?? `No results for "${query.trim()}".`}</Text>
      )}

      {songs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{labels.songs}</Text>
          {songs.map((song) => (
            <SongItem
              key={song.id}
              song={song}
              rightAction={songAction}
              onPress={() => onPressSong(song, songs)}
              onRightActionPress={() =>
                songAction === 'heart' ? onToggleLikeSong?.(song.id) : setMenuSong(song)
              }
            />
          ))}
        </>
      )}

      {albums.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{labels.albums}</Text>
          {albums.map((album) => (
            <SongItem
              key={album.id}
              song={{ id: album.id, title: album.title, artist: album.artist, coverImage: album.coverImage }}
              rightAction="chevron"
              onPress={() => onSelectAlbum?.(album)}
              onRightActionPress={() => onSelectAlbum?.(album)}
            />
          ))}
        </>
      )}

      {artists.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{labels.artists}</Text>
          {artists.map((artist) => {
            const isFollowing = !!currentUser?.followedArtistIds.includes(artist.id);
            return (
              <TouchableOpacity
                key={artist.id}
                style={styles.artistRow}
                onPress={() => onSelectArtist?.(artist)}
                activeOpacity={0.7}
              >
                <Image source={toImageSource(artist.avatarImage)} style={styles.artistAvatar} />
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                  {!!artist.followers && (
                    <View style={styles.followersRow}>
                      <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.followersText}>{artist.followers}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={() => ensureMember() && toggleFollowArtist(artist.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {songAction === 'dots' && (
        <SongActionModal visible={menuSong !== null} song={menuSong} onClose={() => setMenuSong(null)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111216',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  artistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  artistInfo: {
    flex: 1,
    marginLeft: 14,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 3,
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followersText: {
    fontSize: 12,
    color: '#686A70',
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  followingButton: {
    backgroundColor: '#4B5563',
    borderColor: '#4B5563',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111216',
  },
  followingButtonText: {
    color: '#FFFFFF',
  },
});
