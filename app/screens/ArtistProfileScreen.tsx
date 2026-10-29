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
import { IMAGES } from '../../src/constants/images';
import {
  ARTIST_POPULAR_TRACKS,
  ARTIST_ALBUMS,
  ARTIST_FANS_ALSO_LIKE,
} from '../../src/data/musicData';
import { SongItem } from '../../src/components/SongItem';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';

interface ArtistProfileScreenProps {
  onBack?: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onTabPress?: (tab: TabName) => void;
}

export const ArtistProfileScreen: React.FC<ArtistProfileScreenProps> = ({
  onBack,
  onNavigateToPlay,
  onTabPress,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

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
            source={IMAGES.artistRyanProfile}
            style={styles.artistPhoto}
          />
          <Text style={styles.artistName}>Ryan Young</Text>
          <Text style={styles.followersText}>65.1K Followers</Text>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={() => setIsFollowing(!isFollowing)}
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

            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="shuffle" size={22} color="#111216" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => onNavigateToPlay && onNavigateToPlay('apt1')}
              activeOpacity={0.85}
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
          {ARTIST_POPULAR_TRACKS.map((track) => (
            <SongItem
              key={track.id}
              song={track}
              rightAction="dots"
              onPress={() => onNavigateToPlay && onNavigateToPlay(track.id)}
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
          {ARTIST_ALBUMS.map((album) => (
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
            source={IMAGES.artistAboutBand}
            style={styles.aboutImage}
            resizeMode="cover"
          />
          <Text
            style={styles.aboutBio}
            numberOfLines={aboutExpanded ? undefined : 3}
          >
            Do in cupidatat aute et in officia aute laboris est Lorem est nisi
            dolor consequat voluptate duis irure. Veniam quis amet irure cillum
            elit aliquip sunt cillum cillum do aliqua voluptate ad non magna
            elit. Do ea n
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
          {ARTIST_FANS_ALSO_LIKE.map((album) => (
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
    paddingBottom: 24,
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
