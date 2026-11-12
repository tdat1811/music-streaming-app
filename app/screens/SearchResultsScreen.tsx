import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Album, ALL_ALBUMS, ARTISTS } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { GroupedSearchResults } from '../../src/components/GroupedSearchResults';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { useRefreshControl } from '../../src/context/RefreshContext';
import { useSongSearch } from '../../src/hooks/useSongSearch';
import { fuzzySearch } from '../../src/utils/fuzzySearch';

type SearchFilter = 'All' | 'Tracks' | 'Albums' | 'Artists';
const FILTERS: SearchFilter[] = ['All', 'Tracks', 'Albums', 'Artists'];

interface SearchResultsScreenProps {
  // Từ khoá giữ ở Navigation để quay lại màn Search vẫn còn kết quả cũ
  searchQuery?: string;
  onChangeQuery?: (query: string) => void;
  onNavigateToArtist?: (artist?: any) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToAlbum?: (album: Album) => void;
  onTabPress?: (tab: TabName) => void;
}

// Tab Search: tìm kiếm tương đối ngay tại chỗ giống Home (không còn màn gợi ý),
// thêm bộ lọc All / Tracks / Albums / Artists
export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  searchQuery = '',
  onChangeQuery,
  onNavigateToArtist,
  onNavigateToPlay,
  onNavigateToAlbum,
  onTabPress,
}) => {
  const { playSong } = useAudioPlayer();
  const refreshControl = useRefreshControl();
  const [query, setQuery] = useState(searchQuery);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('All');

  const changeQuery = (text: string) => {
    setQuery(text);
    if (onChangeQuery) onChangeQuery(text);
  };

  const isSearching = query.trim() !== '';
  const songs = useSongSearch(query);
  const albums = useMemo(
    () => (isSearching ? fuzzySearch(ALL_ALBUMS, query, (a) => [a.title, a.artist]) : []),
    [query, isSearching]
  );
  const artists = useMemo(
    () => (isSearching ? fuzzySearch(ARTISTS, query, (a) => [a.name]) : []),
    [query, isSearching]
  );

  const show = (filter: SearchFilter) => activeFilter === 'All' || activeFilter === filter;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Thanh tìm kiếm giống Home */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={changeQuery}
          placeholder="What you want to listen to"
          placeholderTextColor={COLORS.textMuted}
          autoCorrect={false}
          autoFocus={!searchQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => changeQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color="#111216" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={styles.filterTab}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{filter}</Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        refreshControl={refreshControl}
      >
        {isSearching ? (
          <GroupedSearchResults
            query={query}
            songs={show('Tracks') ? songs : []}
            albums={show('Albums') ? albums : []}
            artists={show('Artists') ? artists : []}
            onPressSong={(song, queue) => {
              playSong(song, queue);
              if (onNavigateToPlay) onNavigateToPlay(song.id);
            }}
            onSelectAlbum={onNavigateToAlbum}
            onSelectArtist={onNavigateToArtist}
          />
        ) : (
          <View style={styles.hint}>
            <Ionicons name="search" size={40} color={COLORS.textMuted} />
            <Text style={styles.hintText}>Search for songs, albums or artists</Text>
          </View>
        )}
      </ScrollView>

      <BottomTabBar currentTab="Search" onTabPress={(tab) => onTabPress && onTabPress(tab)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Cùng kiểu với thanh tìm kiếm ở Home
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 24,
    height: 44,
    marginHorizontal: 16,
    marginTop: 10,
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
  filterTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 6,
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686A70',
  },
  filterTabTextActive: {
    color: COLORS.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2.5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  listContent: {
    paddingBottom: 90, // Chừa chỗ cho MiniPlayer
    flexGrow: 1,
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  hintText: {
    fontSize: 14,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 12,
  },
});
