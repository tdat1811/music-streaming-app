import React, { useEffect, useState } from 'react';
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
  Artist,
  Song,
  SUGGESTIONS,
  CHARTS,
  TRENDING_ALBUMS,
  POPULAR_ARTISTS,
} from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import {useAudioPlayer} from "../../src/context/AudioPlayerContext"
import { useAuth } from '../../src/context/AuthContext';
import { useAccess } from '../../src/context/AccessContext';
import { api } from '../../src/services/api';
interface HomeScreenProps {
  onSeeAllCharts?: () => void;
  onSeeAllAlbums?: () => void;
  onSeeAllArtists?: () => void;
  onNavigateToSearch?: () => void;
  onNavigateToPlaylist?: (playlistId?: string) => void;
  onNavigateToChartsList?: () => void;
  onNavigateToAlbumsList?: () => void;
  onNavigateToArtistsList?: () => void;
  onNavigateToChart?: (chartTarget: any) => void;
  onNavigateToAlbum?: (album: Album) => void;
  onNavigateToArtist?: (artist?: any) => void;
  onNavigateToPlay?: (trackId?: string) => void;
  onNavigateToLogin?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPlans?: () => void;
  onLogout?: () => void;
  onTabPress?: (tab: TabName) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToSearch,
  onNavigateToPlaylist,
  onNavigateToChartsList,
  onNavigateToAlbumsList,
  onNavigateToArtistsList,
  onNavigateToChart,
  onNavigateToAlbum,
  onNavigateToArtist,
  onNavigateToPlay,
  onNavigateToLogin,
  onNavigateToProfile,
  onNavigateToPlans,
  onLogout,
  onTabPress,
}) => {
  const {playSong, isPlaying, togglePlayPause} = useAudioPlayer();
  const { currentUser, activePlan, isVip, toggleFollowArtist } = useAuth();
  const { ensureMember } = useAccess();
  const [suggestions, setSuggestions] = useState<Song[]>(SUGGESTIONS);
  const [charts, setCharts] = useState(CHARTS);
  const [trendingAlbums, setTrendingAlbums] = useState<Album[]>(TRENDING_ALBUMS);
  const [popularArtists, setPopularArtists] = useState<Artist[]>(POPULAR_ARTISTS);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);
  const [dbSuggestion,setDbSuggestion] = useState<Song[]>(SUGGESTIONS);
  const [loading,setLoading] = useState<boolean>(false);
  const [DBAlbum,setDBAlbum] = useState<Album[]>(TRENDING_ALBUMS);
  const [DBChart,setDBChart]  = useState(CHARTS);


  useEffect(() => {
        async function loadDataFromDB() {
      try {
        setLoading(true);
        // Lấy bài hát gợi ý
        const response: any = await api.songs.getSuggestions();
        if (response?.data) setDbSuggestion(response.data);

        // 👉 THÊM 2 DÒNG NÀY:
        // 1. Lấy danh sách Album thịnh hành từ MongoDB
        const albumRes: any = await api.albums.getTrending();
        if (albumRes?.data) setDBAlbum(albumRes.data);

        // 2. Lấy Bảng xếp hạng Charts từ MongoDB
        const chartRes: any = await api.charts.getAll();
        if (chartRes?.data) setCharts(chartRes.data);

        console.log('✅ Đã tải toàn bộ Suggestions, Albums & Charts từ MongoDB!');
      } catch (error) {
        console.log('⚠️ Dùng dữ liệu mặc định');
      } finally {
        setLoading(false);
      }
    }
    loadDataFromDB();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchFromDb() {
      try {
        const [sugRes, albRes, artRes, chaRes] = await Promise.all([
          api.songs.getSuggestions().catch(() => null),
          api.albums.getTrending().catch(() => null),
          api.artists.getPopular().catch(() => null),
          api.charts.getAll().catch(() => null),
        ]);

        if (!isMounted) return;

        const getData = (res: any) => (Array.isArray(res) ? res : res?.data || []);
        const sugList = getData(sugRes);
        const albList = getData(albRes);
        const artList = getData(artRes);
        const chaList = getData(chaRes);

        if (sugList.length > 0) {
          setSuggestions(
            sugList.map((item: any) => ({
              ...item,
              coverImage: item.coverImage
                ? { uri: item.coverImage }
                : (SUGGESTIONS.find((s) => s.id === item.id)?.coverImage || IMAGES.suggestion1),
            }))
          );
          setIsDbLoaded(true);
        }

        if (albList.length > 0) {
          setTrendingAlbums(
            albList.map((item: any) => ({
              ...item,
              coverImage: item.coverImage
                ? { uri: item.coverImage }
                : (TRENDING_ALBUMS.find((a) => a.id === item.id)?.coverImage || IMAGES.albumMe),
            }))
          );
          setIsDbLoaded(true);
        }

        if (artList.length > 0) {
          setPopularArtists(
            artList.map((item: any) => ({
              ...item,
              avatarImage: item.avatarImage
                ? { uri: item.avatarImage }
                : (POPULAR_ARTISTS.find((a) => a.id === item.id)?.avatarImage || IMAGES.artistJennifer),
            }))
          );
        }

        if (chaList.length > 0) {
          setCharts(
            chaList.map((item: any) => ({
              ...item,
              coverImage: item.coverImage
                ? { uri: item.coverImage }
                : (CHARTS.find((c) => c.id === item.id)?.coverImage || IMAGES.chartCanada),
            }))
          );
        }
      } catch (err) {
        console.log('MongoDB server offline, using local fallback data:', err);
      }
    }
    fetchFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

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
        style={styles.mainScrollView}
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
          {/* Badge thành viên: Gói VIP hiện huy hiệu VIP, chưa có gói hoặc gói Free là thành viên thường */}
          {activePlan && isVip ? (
            <TouchableOpacity
              style={styles.vipBadge}
              onPress={onNavigateToPlans}
              activeOpacity={0.8}
            >
              <Ionicons name="diamond" size={12} color="#FFFFFF" />
              <Text style={styles.vipBadgeText}>VIP • {activePlan.name}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.freeBadge}
              onPress={onNavigateToPlans}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={13} color="#065F46" />
              <Text style={styles.freeBadgeText}>Thành viên Thường</Text>
            </TouchableOpacity>
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
            {dbSuggestion.map((item) => (
             <TouchableOpacity
  key={item.id}
  style={styles.suggestionCard}
  onPress={() => {
    playSong(item, suggestions);
    if (onNavigateToPlay) onNavigateToPlay(item.id);
  }}
  activeOpacity={0.85}
>
  <Image 
    source={typeof item.coverImage === 'string' ? { uri: item.coverImage } : item.coverImage} 
    style={styles.suggestionImage} 
    fadeDuration={0} 
  />

  {/* 👉 Lớp phủ chữ nổi màu đen mờ ở góc dưới của ảnh */}
  <View style={styles.suggestionOverlay}>
    <Text style={styles.suggestionTitle} numberOfLines={1}>
      {item.title}
    </Text>
    <Text style={styles.suggestionArtist} numberOfLines={1}>
      {item.artist}
    </Text>
  </View>
</TouchableOpacity>
            ))}
          </ScrollView>

        {/* Section 2: Charts */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>Charts</Text>
          <TouchableOpacity
            onPress={() => onNavigateToChartsList ? onNavigateToChartsList() : onNavigateToPlaylist && onNavigateToPlaylist()}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}> See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {DBChart.map((chart) => (
            <TouchableOpacity
              key={chart.id}
              style={styles.chartCard}
              onPress={() => {
                if (onNavigateToChart) {
                  onNavigateToChart(chart);
                } else if (onNavigateToPlaylist) {
                  onNavigateToPlaylist(chart.id);
                }
              }}
              activeOpacity={0.85}
            >
              <Image 
              // check string
  source={typeof chart.coverImage === 'string' ? { uri: chart.coverImage } : chart.coverImage} 
  style={styles.chartImage} 
/>
              <Text style={styles.chartUpdateText} numberOfLines={2}>
                {chart.updateText}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 3: Trending albums */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>Trending albums</Text>
          <TouchableOpacity 
            onPress={() => onNavigateToAlbumsList && onNavigateToAlbumsList()}
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
          {DBAlbum.map((album) => (
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
              <Image 
  source={typeof album.coverImage === 'string' ? { uri: album.coverImage } : album.coverImage} 
  style={styles.albumImage} 
/>
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
          <TouchableOpacity 
            onPress={() => onNavigateToArtistsList && onNavigateToArtistsList()}
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
          {popularArtists.map((artist) => {
            const isFollowing = !!currentUser?.followedArtistIds.includes(artist.id);
            return (
            <TouchableOpacity
              key={artist.id}
              style={styles.artistCard}
              onPress={() => onNavigateToArtist && onNavigateToArtist(artist)}
              activeOpacity={0.85}
            >
              <Image
                source={typeof artist.avatarImage === 'string' ? { uri: artist.avatarImage } : artist.avatarImage}
                style={styles.artistImage}
                fadeDuration={0}
              />
              <Text style={styles.artistName} numberOfLines={1}>
                {artist.name}
              </Text>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                activeOpacity={0.8}
                onPress={() => ensureMember() && toggleFollowArtist(artist.id)}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })}
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
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
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
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
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
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#121316',
    paddingVertical: 5,
    paddingHorizontal: 19,
  },
  followingButtonText: {
    color: '#121316',
  },
  suggestionOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.55)', // nền đen mờ 55%
  paddingVertical: 10,
  paddingHorizontal: 12,
},
suggestionTitle: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
},
suggestionArtist: {
  color: '#D1D5DB',
  fontSize: 13,
  marginTop: 2,
},
});
