import React, { useState, useCallback, useMemo } from 'react';
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
import { SEARCH_ARTIST, SEARCH_RESULTS, PLAYLIST_DETAILS_TRACKS, SUGGESTIONS, Song } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';

interface SearchResultsScreenProps {
  searchQuery?: string;
  onBackToSuggestions?: () => void;
  onNavigateToArtist?: (artistId?: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  searchQuery = '',
  onBackToSuggestions,
  onNavigateToArtist,
  onNavigateToPlay,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Tracks' | 'Albums' | 'Artists'>('All');
  const [isFollowing, setIsFollowing] = useState(false);

  const shouldShowSongs = activeFilter === 'All' || activeFilter === 'Tracks';
  const shouldShowArtist = activeFilter === 'All' || activeFilter === 'Artists';
  const filters: ('All' | 'Tracks' | 'Albums' | 'Artists')[] = [
    'All',
    'Tracks',
    'Albums',
    'Artists',
    ];

    const ALL_SONGS: Song[] = useMemo(() => [
      ...SEARCH_RESULTS,
      ...PLAYLIST_DETAILS_TRACKS,
      ...SUGGESTIONS,
    ].filter((song, index, self) => index === self.findIndex((s) => s.id === song.id)), []);

  // Lọc bài hát theo từ khóa tìm kiếm (theo tên bài hát hoặc ca sĩ)
  const q = searchQuery.toLowerCase().trim();
  const displaySongs = useMemo(() => {
    if (q === '') return SEARCH_RESULTS;
    return ALL_SONGS.filter((song) =>
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q)
    );
  }, [q, ALL_SONGS]);

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
        ListHeaderComponent={
          shouldShowArtist ? (
            <View style={styles.artistCardContainer}>
              <Image
                source={SEARCH_ARTIST.avatarImage}
                style={styles.artistAvatar}
                fadeDuration={0}
              />
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{SEARCH_ARTIST.name}</Text>
                <View style={styles.followersRow}>
                  <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.followersText}>{SEARCH_ARTIST.followers}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={() => setIsFollowing(!isFollowing)}
                activeOpacity={0.7}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
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
    backgroundColor: '#10C7D5',
    borderRadius: 2,
  },
  listContent: {
    paddingBottom: 20,
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
