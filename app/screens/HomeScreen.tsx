import React from 'react';
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
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import {
  Album,
  SUGGESTIONS,
  CHARTS,
  TRENDING_ALBUMS,
  POPULAR_ARTISTS,
} from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import {useAudioPlayer} from "../../src/context/AudioPlayerContext"
import { useAuth } from '../../src/context/AuthContext';
interface HomeScreenProps {
  onNavigateToSearch?: () => void;
  onNavigateToPlaylist?: (playlistId?: string) => void;
  onNavigateToChart?: (chartId: string) => void;
  onNavigateToAlbum?: (album: Album) => void;
  onNavigateToArtist?: (artistId?: string) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToLogin?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToSearch,
  onNavigateToPlaylist,
  onNavigateToChart,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlay,
  onNavigateToLogin,
  onNavigateToProfile,
  onLogout,
  onTabPress,
}) => {
  const {playSong, isPlaying, togglePlayPause} = useAudioPlayer();
  const { currentUser, activePlan } = useAuth();

  const handleLogout = () => {
    if (isPlaying) togglePlayPause();
    if (onLogout) onLogout();
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <Image
          source={IMAGES.homeLogo}
          style={styles.logoImage}
          resizeMode="contain"
          fadeDuration={0}
        />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNavigateToProfile}
            activeOpacity={0.8}
          >
            <Image source={IMAGES.homeAvatar} style={styles.avatarImage} fadeDuration={0} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingSub}>Good morning,</Text>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingName} numberOfLines={1}>
              {currentUser ? currentUser.name : 'Guest'}
            </Text>
            <TouchableOpacity
              onPress={currentUser ? handleLogout : onNavigateToLogin}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.accountAction}>{currentUser ? 'Log out' : 'Log in'}</Text>
            </TouchableOpacity>
          </View>
          {activePlan && (
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={12} color="#FFFFFF" />
              <Text style={styles.vipBadgeText}>VIP • {activePlan.name}</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={onNavigateToSearch}
          activeOpacity={0.8}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textMuted}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>What you want to listen to</Text>
        </TouchableOpacity>

        {/* Section 1: Suggestions for you */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggestions for you</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {SUGGESTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.suggestionCard}
              onPress={() => {
                playSong(item, SUGGESTIONS);
                if(onNavigateToPlay){
                  onNavigateToPlay(item.id);
                }
              }}
              activeOpacity={0.85}
            >
              <Image source={item.coverImage} style={styles.suggestionImage} fadeDuration={0} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 2: Charts */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>Charts</Text>
          <TouchableOpacity
            onPress={() => onNavigateToPlaylist && onNavigateToPlaylist()}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {CHARTS.map((chart) => (
            <TouchableOpacity
              key={chart.id}
              style={styles.chartCard}
              onPress={() => {
                if (onNavigateToChart) {
                  onNavigateToChart(chart.id);
                } else if (onNavigateToPlaylist) {
                  onNavigateToPlaylist(chart.id);
                }
              }}
              activeOpacity={0.85}
            >
              <Image source={chart.coverImage} style={styles.chartImage} fadeDuration={0} />
              <Text style={styles.chartUpdateText} numberOfLines={2}>
                {chart.updateText}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 3: Trending albums */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>Trending albums</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {TRENDING_ALBUMS.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              onPress={() => {
                if (onNavigateToAlbum) {
                  onNavigateToAlbum(album);
                } else if (onNavigateToPlaylist) {
                  onNavigateToPlaylist(album.id);
                }
              }}
              activeOpacity={0.85}
            >
              <Image source={album.coverImage} style={styles.albumImage} fadeDuration={0} />
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {album.artist}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 4: Popular artists */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>Popular artists</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {POPULAR_ARTISTS.map((artist) => (
            <TouchableOpacity
              key={artist.id}
              style={styles.artistCard}
              onPress={() => onNavigateToArtist && onNavigateToArtist(artist.id)}
              activeOpacity={0.85}
            >
              <Image source={artist.avatarImage} style={styles.artistImage} fadeDuration={0} />
              <Text style={styles.artistName} numberOfLines={1}>
                {artist.name}
              </Text>
              <TouchableOpacity
                style={styles.followButton}
                activeOpacity={0.8}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoImage: {
    width: 38,
    height: 26,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  greetingContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
  },
  greetingSub: {
    fontSize: 14,
    color: '#686A70',
    marginBottom: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greetingName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#111216',
  },
  accountAction: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#7B2CBF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  vipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 24,
    height: 44,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111216',
  },
  seeAllText: {
    fontSize: 13,
    color: '#686A70',
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  suggestionCard: {
    width: 220,
    height: 290,
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chartCard: {
    width: 140,
  },
  chartImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  chartUpdateText: {
    fontSize: 12,
    color: '#686A70',
    marginTop: 6,
    lineHeight: 16,
  },
  albumCard: {
    width: 136,
  },
  albumImage: {
    width: 136,
    height: 136,
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
  artistCard: {
    width: 136,
    alignItems: 'center',
  },
  artistImage: {
    width: 136,
    height: 136,
    borderRadius: 68,
    marginBottom: 8,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111216',
    textAlign: 'center',
    marginBottom: 8,
  },
  followButton: {
    backgroundColor: '#121316',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
