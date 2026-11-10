import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Album, ALL_SONGS, ARTIST_ALBUMS, ARTISTS, Song, Artist } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { SongActionModal } from '../../src/components/SongActionModal';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
import { shuffleTracks, useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { api } from '../../src/services/api';

const DEFAULT_ARTIST_ID = 'art1';

interface ArtistProfileScreenProps {
  artistId?: string | null;
  initialArtist?: Artist | null;
  onSelectArtist?: (artist: any) => void;
  onSelectAlbum?: (album: Album) => void;
  onBack?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const ArtistProfileScreen: React.FC<ArtistProfileScreenProps> = ({
  artistId,
  initialArtist,
  onSelectArtist,
  onSelectAlbum,
  onBack,
  onNavigateToPlay,
  onTabPress,
}) => {
  const { currentUser, toggleFollowArtist } = useAuth();
  const currentId = artistId ?? (initialArtist?.id || DEFAULT_ARTIST_ID);

  // Chỉ lấy localArtist nếu khớp đúng ID hiện tại, tuyệt đối không fallback sang Ryan Young nếu đang mở nghệ sĩ khác
  const localArtist =
    (initialArtist && initialArtist.id === currentId ? initialArtist : null) ||
    ARTISTS.find((item) => item.id === currentId) ||
    (!artistId ? ARTISTS[0] : null);

  const localTracks = localArtist ? ALL_SONGS.filter((song) => song.artist === localArtist.name) : [];
  const localAlbums = localArtist ? ARTIST_ALBUMS.filter((album) => album.artist === localArtist.name) : [];
  const localRelated = localArtist ? ARTISTS.filter((item) => item.id !== localArtist.id) : [];

  // Database states
  const [dbArtist, setDbArtist] = useState<Artist | null>(localArtist);
  const [dbTracks, setDbTracks] = useState<Song[]>(localTracks);
  const [dbAlbums, setDbAlbums] = useState<Album[]>(localAlbums);
  const [dbRelated, setDbRelated] = useState<Artist[]>(localRelated);
  const [loading, setLoading] = useState<boolean>(!localArtist);

  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songModalVisible, setSongModalVisible] = useState(false);
  const { playSong } = useAudioPlayer();

  useEffect(() => {
    let isMounted = true;

    // Reset lại khi đổi nghệ sĩ mới để không bị giật dữ liệu của người cũ
    if (!localArtist) {
      setDbArtist(null);
      setDbTracks([]);
      setDbAlbums([]);
      setDbRelated([]);
      setLoading(true);
    }

    async function loadArtistData() {
      try {
        const res: any = await api.artists.getById(currentId);
        const data = res?.data || res;
        if (isMounted && data && data.name) {
          setDbArtist(data);
          if (Array.isArray(data.tracks)) setDbTracks(data.tracks);
          if (Array.isArray(data.albums)) setDbAlbums(data.albums);
          if (Array.isArray(data.relatedArtists)) setDbRelated(data.relatedArtists);
        }
      } catch (err) {
        console.log('Using local fallback for artist profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadArtistData();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  const activeArtist = dbArtist || localArtist;
  const activeTracks = dbTracks.length > 0 ? dbTracks : localTracks;
  const activeAlbums = dbAlbums.length > 0 ? dbAlbums : localAlbums;
  const activeRelated = dbRelated.length > 0 ? dbRelated : localRelated;

  const isFollowing = activeArtist ? !!currentUser?.followedArtistIds.includes(activeArtist.id) : false;

  const playFrom = (track: Song, queue: Song[]) => {
    playSong(track, queue);
    if (onNavigateToPlay) onNavigateToPlay(track.id);
  };

  const handleShuffle = () => {
    if (activeTracks.length === 0) return;
    const queue = shuffleTracks(activeTracks);
    playFrom(queue[0], queue);
  };

  const resolveImage = (img: any) =>
    typeof img === 'string' ? { uri: img } : img;

  // Nếu đang tải và chưa có bất kỳ thông tin nghệ sĩ nào, hiển thị màn hình chờ mượt mà
  if (!activeArtist || (loading && !activeArtist.name)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải hồ sơ nghệ sĩ...</Text>
        </View>
        <BottomTabBar currentTab="Home" onTabPress={(tab) => onTabPress && onTabPress(tab)} />
      </SafeAreaView>
    );
  }

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
            source={resolveImage(activeArtist.avatarImage)}
            style={styles.artistPhoto}
          />
          <View style={styles.nameVerifiedRow}>
            <Text style={styles.artistName}>{activeArtist.name}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#00A3FF" style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.followersText}>{activeArtist.followers || '1.2M Followers'}</Text>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={() => toggleFollowArtist(activeArtist.id)}
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
              onPress={() => activeTracks.length > 0 && playFrom(activeTracks[0], activeTracks)}
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
          {activeTracks.length === 0 ? (
            <Text style={styles.emptyText}>Đang tải các bài hát phổ biến...</Text>
          ) : (
            activeTracks.map((track) => (
              <SongItem
                key={track.id}
                song={track}
                rightAction="dots"
                onPress={() => playFrom(track, activeTracks)}
                onRightActionPress={() => {
                  setSelectedSong(track);
                  setSongModalVisible(true);
                }}
              />
            ))
          )}
        </View>

        {/* Section: Albums */}
        {activeAlbums.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Albums</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {activeAlbums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumCard}
                  onPress={() => onSelectAlbum && onSelectAlbum(album)}
                  activeOpacity={0.85}
                >
                  <Image source={resolveImage(album.coverImage)} style={styles.albumImage} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>
                    {album.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Section: About */}
        {activeArtist.bio ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <View style={styles.aboutContainer}>
              {activeArtist.aboutImage ? (
                <Image
                  source={resolveImage(activeArtist.aboutImage)}
                  style={styles.aboutImage}
                  resizeMode="cover"
                />
              ) : null}
              <Text
                style={styles.aboutBio}
                numberOfLines={aboutExpanded ? undefined : 3}
              >
                {activeArtist.bio}
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
          </>
        ) : null}

        {/* Section: Fans also like */}
        {activeRelated.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fans also like</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {activeRelated.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.albumCard}
                  onPress={() => onSelectArtist && onSelectArtist(item)}
                  activeOpacity={0.85}
                >
                  <Image source={resolveImage(item.avatarImage)} style={styles.relatedArtistImage} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>
                    {item.followers || 'Artist'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Action modal for single song */}
      <SongActionModal
        visible={songModalVisible}
        song={selectedSong}
        onClose={() => {
          setSongModalVisible(false);
          setSelectedSong(null);
        }}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar currentTab="Home" onTabPress={(tab) => onTabPress && onTabPress(tab)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  artistPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: {
    fontSize: 22,
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
    width: '100%',
    gap: 12,
  },
  followButton: {
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#111216',
  },
  followingButton: {
    backgroundColor: '#111216',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111216',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111216',
  },
  popularTracksList: {
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
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
    backgroundColor: '#F3F4F6',
  },
  relatedArtistImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
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
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  aboutImage: {
    width: '100%',
    height: 160,
  },
  aboutBio: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    padding: 14,
  },
  viewMoreBtn: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
