import React, { useState } from 'react';
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
import { SEARCH_ARTIST, SEARCH_RESULTS, Song } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';

interface SearchResultsScreenProps {
  onBackToSuggestions?: () => void;
  onNavigateToArtist?: (artistId?: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({
  onBackToSuggestions,
  onNavigateToArtist,
  onNavigateToPlay,
  onTabPress,
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Tracks' | 'Albums' | 'Artists'>('All');
  const [isFollowing, setIsFollowing] = useState(false);

  const filters: ('All' | 'Tracks' | 'Albums' | 'Artists')[] = [
    'All',
    'Tracks',
    'Albums',
    'Artists',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Search Pill */}
      <View style={styles.header}>
        <View style={styles.searchPill}>
          <TextInput
            style={styles.input}
            value="me"
            onFocus={onBackToSuggestions}
            placeholder="Search"
            placeholderTextColor={COLORS.textMuted}
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
        data={SEARCH_RESULTS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          /* Mer Watson Artist Card */
          <View style={styles.artistCardContainer}>
            <Image
              source={SEARCH_ARTIST.avatarImage}
              style={styles.artistAvatar}
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
              onPress={() => {
                setIsFollowing(!isFollowing);
                if (onNavigateToArtist) onNavigateToArtist();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SongItem
            song={item}
            rightAction="dots"
            onPress={() => onNavigateToPlay && onNavigateToPlay(item.id)}
          />
        )}
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
