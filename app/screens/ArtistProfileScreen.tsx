import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { ALL_SONGS, ARTIST_ALBUMS, ARTISTS, Song } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
import { shuffleTracks, useAudioPlayer } from '../../src/context/AudioPlayerContext';

// Dùng khi mở trang từ menu Screens, chưa chọn nghệ sĩ nào
const DEFAULT_ARTIST_ID = 'ar1';

interface ArtistProfileScreenProps {
  artistId?: string | null;
  onSelectArtist?: (artistId: string) => void;
  onBack?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const ArtistProfileScreen: React.FC<ArtistProfileScreenProps> = ({
  artistId,
  onSelectArtist,
  onBack,
  onNavigateToPlay,
  onTabPress,
}) => {
  const { currentUser, toggleFollowArtist } = useAuth();
  const artist =
    ARTISTS.find((item) => item.id === (artistId ?? DEFAULT_ARTIST_ID)) ??
    ARTISTS.find((item) => item.id === DEFAULT_ARTIST_ID) ??
    ARTISTS[0];
  const tracks = ALL_SONGS.filter((song) => song.artist === artist.name);
  const albums = ARTIST_ALBUMS.filter((album) => album.artist === artist.name);
  const relatedArtists = ARTISTS.filter((item) => item.id !== artist.id);
  const isFollowing = !!currentUser?.followedArtistIds.includes(artist.id);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const { playSong } = useAudioPlayer();

  const playFrom = (track: Song, queue: Song[]) => {
    playSong(track, queue);
    if (onNavigateToPlay) onNavigateToPlay(track.id);
  };

  const handleShuffle = () => {
    const queue = shuffleTracks(tracks);
    playFrom(queue[0], queue);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerIconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <Image
            source={artist.avatarImage}
            style={styles.artistPhoto}
          />
          <Text style={styles.artistName}>{artist.name}</Text>
          <Text style={styles.followersText}>{artist.followers}</Text>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={() => toggleFollowArtist(artist.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn}>
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={24}
                color="#111216"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleShuffle}
              accessibilityLabel="Shuffle artist tracks"
            >
              <Ionicons name="shuffle" size={22} color="#111216" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playFrom(tracks[0], tracks)}
              activeOpacity={0.85}
              accessibilityLabel="Play artist tracks"
            >
              <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Popular */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular</Text>
        </View>
        <View style={styles.popularTracksList}>
          {tracks.map((track) => (
            <SongItem
              key={track.id}
              song={track}
              rightAction="dots"
              onPress={() => playFrom(track, tracks)}
            />
          ))}
        </View>

        {/* Section: Albums */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Albums</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {albums.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              activeOpacity={0.85}
            >
              <Image source={album.coverImage} style={styles.albumImage} />
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {album.artist}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section: About */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <View style={styles.aboutContainer}>
          <Image
            source={artist.aboutImage}
            style={styles.aboutImage}
            resizeMode="cover"
          />
          <Text
            style={styles.aboutBio}
            numberOfLines={aboutExpanded ? undefined : 3}
          >
            {artist.bio}
          </Text>
          <TouchableOpacity
            onPress={() => setAboutExpanded(!aboutExpanded)}
            style={styles.viewMoreBtn}
          >
            <Text style={styles.viewMoreText}>
              {aboutExpanded ? 'View less' : 'View more'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Fans also like */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fans also like</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {relatedArtists.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.albumCard}
              onPress={() => onSelectArtist && onSelectArtist(item.id)}
              activeOpacity={0.85}
            >
              <Image source={item.avatarImage} style={styles.relatedArtistImage} />
              <Text style={styles.albumTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {item.followers}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Home"
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
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
  },
  headerIconBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 76, // Chừa chỗ cho MiniPlayer
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  artistPhoto: {
    width: 190,
    height: 190,
    borderRadius: 95,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111216',
    marginBottom: 4,
  },
  followersText: {
    fontSize: 13,
    color: '#686A70',
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    width: '100%',
    paddingHorizontal: 24,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 26,
  },
  followingButton: {
    backgroundColor: '#121316',
    borderColor: '#121316',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111216',
  },
  followingButtonText: {
    color: '#FFFFFF',
  },
  iconBtn: {
    padding: 6,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#121316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111216',
  },
  popularTracksList: {
    marginBottom: 6,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  albumCard: {
    width: 130,
  },
  albumImage: {
    width: 130,
    height: 130,
    borderRadius: 8,
    marginBottom: 6,
  },
  relatedArtistImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 6,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111216',
  },
  albumArtist: {
    fontSize: 12,
    color: '#686A70',
    marginTop: 2,
  },
  aboutContainer: {
    paddingHorizontal: 20,
  },
  aboutImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  aboutBio: {
    fontSize: 13,
    color: '#686A70',
    lineHeight: 19,
  },
  viewMoreBtn: {
    marginTop: 6,
    alignSelf: 'center',
  },
  viewMoreText: {
    fontSize: 13,
    color: '#10C7D5',
    fontWeight: '600',
  },
});
