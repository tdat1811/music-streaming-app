import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { LIBRARY_ARTIST, LIBRARY_TRACKS } from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';

interface MyLibraryScreenProps {
  onNavigateToPlaylists?: () => void;
  onNavigateToPlaylistDetails?: () => void;
  onNavigateToArtist?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToSearch?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const MyLibraryScreen: React.FC<MyLibraryScreenProps> = ({
  onNavigateToPlaylists,
  onNavigateToPlaylistDetails,
  onNavigateToArtist,
  onNavigateToPlay,
  onNavigateToSearch,
  onTabPress,
}) => {
  const [selectedTag, setSelectedTag] = useState('Playlists');
  const [isFollowing, setIsFollowing] = useState(false);

  const tags = ['Playlists', 'New tag', 'Songs', 'Albums', 'Artists'];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <TouchableOpacity
          onPress={onNavigateToSearch}
          style={styles.searchIconBtn}
          activeOpacity={0.7}
        >
          <Feather name="search" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tags */}
      <View style={styles.tagsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          {tags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                onPress={() => {
                  setSelectedTag(tag);
                  if (tag === 'Playlists' && onNavigateToPlaylists) {
                    onNavigateToPlaylists();
                  }
                }}
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

      {/* Library Content List */}
      <FlatList
        data={LIBRARY_TRACKS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          /* Mer Watson Artist Item */
          <View style={styles.artistCardContainer}>
            <Image
              source={LIBRARY_ARTIST.avatarImage}
              style={styles.artistAvatar}
            />
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{LIBRARY_ARTIST.name}</Text>
              <View style={styles.followersRow}>
                <Ionicons
                  name="person-outline"
                  size={13}
                  color={COLORS.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.followersText}>
                  {LIBRARY_ARTIST.followers}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={() => {
                setIsFollowing(!isFollowing);
                if (onNavigateToArtist) onNavigateToArtist();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SongItem
            song={item}
            rightAction={item.isPlaylist ? 'chevron' : 'heart'}
            onPress={() => {
              if (item.isPlaylist) {
                if (onNavigateToPlaylistDetails) onNavigateToPlaylistDetails();
              } else {
                if (onNavigateToPlay) onNavigateToPlay(item.id);
              }
            }}
          />
        )}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Library"
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
    paddingBottom: 20,
  },
  artistCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
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
    backgroundColor: '#121316',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 22,
  },
  followingButton: {
    backgroundColor: '#4B5563',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
