import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { ARTISTS, ALL_ALBUMS, Album, Artist, getSongsByIds, Playlist } from '../../src/data/musicData';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { fuzzySearch } from '../../src/utils/fuzzySearch';
import { toImageSource } from '../../src/utils/imageSource';
import { AuthInput } from '../../src/components/AuthInput';
import { SongItem } from '../../src/components/SongItem';
import { TrackListView } from '../../src/components/TrackListView';
import { GroupedSearchResults } from '../../src/components/GroupedSearchResults';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
import { useAccess } from '../../src/context/AccessContext';
import { useRefreshControl } from '../../src/context/RefreshContext';
import { RefreshButton } from '../../src/components/RefreshButton';

export type LibraryTag = 'Playlists' | 'Songs' | 'Albums' | 'Artists';

const TAGS: LibraryTag[] = ['Playlists', 'Songs', 'Albums', 'Artists'];

interface MyLibraryScreenProps {
  selectedTag: LibraryTag;
  onSelectTag: (tag: LibraryTag) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onSelectAlbum?: (album: Album) => void;
  onSelectArtist?: (artistId: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToSearch?: () => void;
  onNavigateToLogin?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const MyLibraryScreen: React.FC<MyLibraryScreenProps> = ({
  selectedTag,
  onSelectTag,
  onSelectPlaylist,
  onSelectAlbum,
  onSelectArtist,
  onNavigateToPlay,
  onNavigateToSearch,
  onNavigateToLogin,
  onTabPress,
}) => {
  const { currentUser, userPlaylists, createPlaylist, toggleLikeSong, toggleFollowArtist, likedAlbumIds } = useAuth();
  const { ensureVip } = useAccess();
  const { playSong } = useAudioPlayer();
  const refreshControl = useRefreshControl();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistError, setNewPlaylistError] = useState('');

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setNewPlaylistName('');
    setNewPlaylistError('');
  };

  const [creating, setCreating] = useState(false);

  const handleCreatePlaylist = async () => {
    if (creating) return;
    if (newPlaylistName.trim() === '') {
      setNewPlaylistError('Please enter a playlist name.');
      return;
    }
    setCreating(true);
    const error = await createPlaylist(newPlaylistName);
    setCreating(false);
    if (error) {
      setNewPlaylistError(error);
      return;
    }
    closeCreateModal();
  };

  const likedSongs = useMemo(
    () =>
      getSongsByIds(currentUser?.likedSongIds ?? []).map((song) => ({ ...song, isLiked: true })),
    [currentUser?.likedSongIds]
  );

  const followedArtists = useMemo(
    () =>
      (currentUser?.followedArtistIds ?? []).flatMap(
        (id) => ARTISTS.find((artist) => artist.id === id) ?? []
      ),
    [currentUser?.followedArtistIds]
  );

  const likedAlbums = useMemo(
    () => ALL_ALBUMS.filter((album) => likedAlbumIds.includes(album.id)),
    [likedAlbumIds]
  );

  // Tìm kiếm tương đối, chỉ trong thư viện của người dùng:
  // bài hát đã thích, album đã thích và nghệ sĩ đang theo dõi
  const isSearching = searchQuery.trim() !== '';
  const matchedSongs = useMemo(
    () => fuzzySearch(likedSongs, searchQuery, (song) => [song.title, song.artist]),
    [likedSongs, searchQuery]
  );
  const matchedAlbums = useMemo(
    () => fuzzySearch(likedAlbums, searchQuery, (album) => [album.title, album.artist]),
    [likedAlbums, searchQuery]
  );
  const matchedArtists = useMemo(
    () => fuzzySearch(followedArtists, searchQuery, (artist) => [artist.name]),
    [followedArtists, searchQuery]
  );

  const closeSearch = () => {
    setSearchVisible(false);
    setSearchQuery('');
  };

  const renderPlaylists = () => (
    <FlatList
      data={userPlaylists}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={styles.playlistsContent}
      ListEmptyComponent={<Text style={styles.emptyText}>You have no playlists yet.</Text>}
      renderItem={({ item }) => {
        const openPlaylist = () => onSelectPlaylist && onSelectPlaylist(item);
        return (
          <SongItem
            song={{
              id: item.id,
              title: item.title,
              artist: currentUser?.name ?? '',
              coverImage: item.coverImage,
              isPlaylist: true,
              songCount: item.songIds.length,
            }}
            rightAction="chevron"
            onPress={openPlaylist}
            onRightActionPress={openPlaylist}
          />
        );
      }}
    />
  );

  const renderAlbums = () => (
    <FlatList
      data={likedAlbums}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={styles.playlistsContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>You haven\'t liked any albums yet.</Text>
      }
      renderItem={({ item }) => (
        <SongItem
          song={{
            id: item.id,
            title: item.title,
            artist: item.artist,
            coverImage: item.coverImage,
            isLiked: true,
          }}
          rightAction="chevron"
          onPress={() => onSelectAlbum && onSelectAlbum(item)}
          onRightActionPress={() => onSelectAlbum && onSelectAlbum(item)}
        />
      )}
    />
  );

  const renderSongs = () => (
    <TrackListView
      title="Liked Songs"
      description="Your favorite tracks"
      coverImage={IMAGES.libraryTrack1}
      tracks={likedSongs}
      emptyText="You have no liked songs yet."
      onNavigateToPlay={onNavigateToPlay}
      onToggleLike={toggleLikeSong}
    />
  );

  const renderArtistRow = (item: Artist) => (
    <TouchableOpacity
      key={item.id}
      style={styles.artistRow}
      onPress={() => onSelectArtist && onSelectArtist(item.id)}
      activeOpacity={0.7}
    >
      <Image source={toImageSource(item.avatarImage)} style={styles.artistAvatar} />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.followersRow}>
          <Ionicons
            name="person-outline"
            size={13}
            color={COLORS.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.followersText}>{item.followers}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.followingButton}
        onPress={() => toggleFollowArtist(item.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.followingButtonText}>Following</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArtists = () => (
    <FlatList
      data={followedArtists}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>You are not following any artists yet.</Text>
      }
      renderItem={({ item }) => renderArtistRow(item)}
    />
  );

  // Kết quả tìm trong thư viện, chia theo nhóm Songs / Albums / Artists
  const renderSearchResults = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
    >
      <GroupedSearchResults
        query={searchQuery}
        songs={matchedSongs}
        albums={matchedAlbums}
        artists={matchedArtists}
        labels={{ songs: 'Liked songs', albums: 'Liked albums', artists: 'Followed artists' }}
        emptyText={`No liked songs, liked albums or followed artists match "${searchQuery.trim()}".`}
        songAction="heart"
        onToggleLikeSong={toggleLikeSong}
        onPressSong={(song, queue) => {
          playSong(song, queue);
          if (onNavigateToPlay) onNavigateToPlay(song.id);
        }}
        onSelectAlbum={onSelectAlbum}
        onSelectArtist={(artist) => onSelectArtist && onSelectArtist(artist.id)}
      />
    </ScrollView>
  );

  const renderContent = () => {
    if (!currentUser) {
      return (
        <View style={styles.guestContainer}>
          <Text style={styles.guestText}>Log in to see your library</Text>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={onNavigateToLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.guestButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (isSearching) return renderSearchResults();
    switch (selectedTag) {
      case 'Playlists':
        return (
          <>
            {renderPlaylists()}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => ensureVip('Tạo playlist mới') && setCreateModalVisible(true)}
              accessibilityLabel="Create playlist"
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        );
      case 'Songs':
        return renderSongs();
      case 'Artists':
        return renderArtists();
      case 'Albums':
        return renderAlbums();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <View style={styles.headerActions}>
        <RefreshButton />
        <TouchableOpacity
          onPress={() => (searchVisible ? closeSearch() : setSearchVisible(true))}
          style={styles.searchIconBtn}
          activeOpacity={0.7}
          accessibilityLabel={searchVisible ? 'Close library search' : 'Search your library'}
        >
          <Feather name={searchVisible ? 'x' : 'search'} size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        </View>
      </View>

      {/* Ô tìm kiếm trong thư viện (chỉ bài hát/album đã thích và nghệ sĩ đang theo dõi) */}
      {searchVisible && currentUser && (
        <View style={styles.searchPill}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search liked songs, albums, artists"
            placeholderTextColor={COLORS.textMuted}
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#111216" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Tags (ẩn khi đang hiển thị kết quả tìm kiếm) */}
      {!isSearching && (
      <View style={styles.tagsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          {TAGS.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                onPress={() => onSelectTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    isSelected && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/* Library Content */}
      <View style={styles.flex}>{renderContent()}</View>

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Library"
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />

      {/* Create Playlist Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New playlist</Text>
            <AuthInput
              icon="musical-notes-outline"
              placeholder="Playlist name"
              autoCapitalize="sentences"
              autoFocus
              maxLength={40}
              value={newPlaylistName}
              onChangeText={(text) => {
                setNewPlaylistName(text);
                setNewPlaylistError('');
              }}
              onSubmitEditing={handleCreatePlaylist}
              error={newPlaylistError}
            />
            <TouchableOpacity
              style={styles.modalCreateButton}
              onPress={handleCreatePlaylist}
              disabled={creating}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCreateText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={closeCreateModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
  },
  searchIconBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tagsContainer: {
    marginVertical: 10,
  },
  tagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tagPillSelected: {
    backgroundColor: '#E5E7EB',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  tagTextSelected: {
    color: '#111216',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 76, // Chừa chỗ cho MiniPlayer
  },
  playlistsContent: {
    paddingBottom: 148, // Chừa chỗ cho MiniPlayer và nút tạo playlist
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 72, // Nằm trên MiniPlayer
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#121316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111216',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalCreateButton: {
    backgroundColor: '#121316',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#686A70',
  },
  emptyText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 24,
    height: 44,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#111216',
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
  followingButton: {
    backgroundColor: '#4B5563',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  followingButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  guestText: {
    fontSize: 15,
    color: '#686A70',
    textAlign: 'center',
    marginBottom: 16,
  },
  guestButton: {
    backgroundColor: '#121316',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
