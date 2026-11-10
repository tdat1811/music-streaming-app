import React, { useState, useCallback, useMemo ,useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Album, ALL_ALBUMS, ALL_SONGS, Artist, ARTISTS, SEARCH_RESULTS, Song } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { SongActionModal } from '../../src/components/SongActionModal';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
interface SearchResultsScreenProps {
  searchQuery?: string;
  onBackToSuggestions?: () => void;
  onNavigateToArtist?: (artistId?: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToAlbum?: (album: Album) => void;
  onTabPress?: (tab: TabName) => void;
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  searchQuery = '',
  onBackToSuggestions,
  onNavigateToArtist,
  onNavigateToPlay,
  onNavigateToAlbum,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Tracks' | 'Albums' | 'Artists'>('All');
  const { currentUser, toggleFollowArtist } = useAuth();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songModalVisible, setSongModalVisible] = useState(false);

  const shouldShowSongs = activeFilter === 'All' || activeFilter === 'Tracks';
  const shouldShowArtists = activeFilter === 'All' || activeFilter === 'Artists';
  const shouldShowAlbums = activeFilter === 'All' || activeFilter === 'Albums';
  const [dbSongs, setDbSongs] = useState<Song[]>([]);
  const filters: ('All' | 'Tracks' | 'Albums' | 'Artists')[] = [
    'All',
    'Tracks',
    'Albums',
    'Artists',
    ];

     useEffect(() => {
    async function searchFromDB() {
      try {
        // Gọi API tìm kiếm lên backend Express + MongoDB
        const res: any = await api.songs.search(searchQuery);
        
        if (res && res.songs) {
          console.log(`🔎 MongoDB tìm thấy ${res.songs.length} bài hát cho từ khóa "${searchQuery}"`);
          setDbSongs(res.songs);
        }
      } catch (error) {
        console.log('⚠️ Không gọi được API tìm kiếm, dùng dữ liệu mặc định');
      }
    }
    searchFromDB();
  }, [searchQuery]);

  // Lọc kho nhạc theo từ khóa (bài hát theo tên hoặc ca sĩ, album theo tên hoặc nghệ sĩ)
  const q = searchQuery.toLowerCase().trim();
  const matches = (text: string) => text.toLowerCase().includes(q);

    const displaySongs = useMemo(() => {
    // NẾU DATABASE CÓ KẾT QUẢ THÌ ƯU TIÊN HIỂN THỊ TỪ DATABASE:
    if (dbSongs && dbSongs.length > 0) return dbSongs;

    // Dự phòng khi server offline:
    if (q === '') return SEARCH_RESULTS;
    return ALL_SONGS.filter((song) => matches(song.title) || matches(song.artist)).filter(
      (song, index, self) =>
        index === self.findIndex((s) => s.title === song.title && s.artist === song.artist)
    );
  }, [q, dbSongs]);

  const displayArtists = useMemo(() => ARTISTS.filter((artist) => matches(artist.name)), [q]);

  const displayAlbums = useMemo(
    () => ALL_ALBUMS.filter((album) => matches(album.title) || matches(album.artist)),
    [q]
  );

  const hasResults =
    (shouldShowSongs && displaySongs.length > 0) ||
    (shouldShowArtists && displayArtists.length > 0) ||
    (shouldShowAlbums && displayAlbums.length > 0);

  const renderArtist = (artist: Artist) => {
    const isFollowing = !!currentUser?.followedArtistIds.includes(artist.id);
    return (
      <TouchableOpacity
        key={artist.id}
        style={styles.artistCardContainer}
        onPress={() => onNavigateToArtist && onNavigateToArtist(artist.id)}
        activeOpacity={0.7}
      >
        <Image source={artist.avatarImage} style={styles.artistAvatar} fadeDuration={0} />
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{artist.name}</Text>
          <View style={styles.followersRow}>
            <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.followersText}>{artist.followers}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={() => toggleFollowArtist(artist.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderAlbum = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={styles.albumRow}
      onPress={() => onNavigateToAlbum && onNavigateToAlbum(album)}
      activeOpacity={0.7}
    >
      <Image source={album.coverImage} style={styles.albumCover} fadeDuration={0} />
      <View style={styles.artistInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
        <Text style={styles.followersText} numberOfLines={1}>{album.artist}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={COLORS.textPrimary} />
    </TouchableOpacity>
  );

  const renderSongItem = useCallback(({ item }: { item: Song }) => (
    <SongItem
      song={item}
      rightAction="dots"
      onPress={() => {
        playSong(item, displaySongs);
        if (onNavigateToPlay) {
          onNavigateToPlay(item.id);
        }
      }}
      onRightActionPress={() => {
        setSelectedSong(item);
        setSongModalVisible(true);
      }}
    />
  ), [displaySongs, playSong, onNavigateToPlay]);

  const keyExtractor = useCallback((item: Song) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Search Pill */}
      <View style={styles.header}>
        <View style={styles.searchPill}>
          <TextInput
            style={styles.input}
            value={searchQuery}
            onFocus={onBackToSuggestions}
            placeholder="Search"
            placeholderTextColor={COLORS.textMuted}
            editable={false}
          />
          <TouchableOpacity
            onPress={onBackToSuggestions}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#111216" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {filter}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results List */}
      <FlatList
        data={shouldShowSongs ? displaySongs : []}
        keyExtractor={keyExtractor}
        renderItem={renderSongItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={shouldShowArtists ? <>{displayArtists.map(renderArtist)}</> : undefined}
        ListFooterComponent={
          shouldShowAlbums && displayAlbums.length > 0 ? (
            <>
              {activeFilter === 'All' && <Text style={styles.sectionTitle}>Albums</Text>}
              {displayAlbums.map(renderAlbum)}
            </>
          ) : undefined
        }
        ListEmptyComponent={
          hasResults ? undefined : (
            <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
          )
        }
      />

      {/* Song Action Modal */}
      <SongActionModal
        visible={songModalVisible}
        song={selectedSong}
        onClose={() => {
          setSongModalVisible(false);
          setSelectedSong(null);
        }}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Search"
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111216',
  },
  clearButton: {
    padding: 2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 6,
    marginBottom: 8,
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  filterTabActive: {},
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686A70',
  },
  filterTabTextActive: {
    color: '#10C7D5',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2.5,
    backgroundColor: '#F97316',
    borderRadius: 2,
  },
  listContent: {
    paddingBottom: 76, // Chừa chỗ cho MiniPlayer
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111216',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  albumCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  artistCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    paddingHorizontal: 20,
  },
  followingButton: {
    backgroundColor: '#121316',
    borderColor: '#121316',
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
