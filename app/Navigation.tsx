import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenSwitcher, ScreenId } from '../src/components/ScreenSwitcher';
import { TabName } from '../src/components/BottomTabBar';

// All 13 Screens
import { LaunchScreen } from './screens/LaunchScreen';
import { LaunchScreenPremium } from './screens/LaunchScreenPremium';
import { SubscriptionPlansScreen } from './screens/SubscriptionPlansScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchAudioScreen } from './screens/SearchAudioScreen';
import { SearchResultsScreen } from './screens/SearchResultsScreen';
import { FeedScreen } from './screens/FeedScreen';
import { FeedCommentsScreen } from './screens/FeedCommentsScreen';
import { MyLibraryScreen, LibraryTag } from './screens/MyLibraryScreen';
import { PlaylistDetailsScreen } from './screens/PlaylistDetailsScreen';
import { ArtistProfileScreen } from './screens/ArtistProfileScreen';
import { PlayAudioScreen } from './screens/PlayAudioScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import {MiniPlayer} from "../src/components/MiniPlayer";
import { useAuth } from '../src/context/AuthContext';
import { Album, CHARTS, getAlbumSongIds, getChartSongIds, Playlist } from '../src/data/musicData';
export const Navigation: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('Launch');
  const [history, setHistory] = useState<ScreenId[]>(['Launch']);
   const [searchQuery, setSearchQuery] = useState<string>('');
  // Màn hình cần quay lại sau khi đăng nhập (ví dụ khách bấm mua gói ở màn chọn gói)
  const [afterAuth, setAfterAuth] = useState<ScreenId | null>(null);
  // Giữ ở đây để không mất tag đang chọn khi quay lại từ màn Play hoặc Playlist Details
  const [libraryTag, setLibraryTag] = useState<LibraryTag>('Playlists');
  // null là playlist mẫu Top 50 - Canada
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  // null là bài post đầu tiên (khi mở màn bình luận từ menu Screens)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // Các nghệ sĩ đã mở, phần tử cuối là trang đang xem (nút quay lại đi ngược danh sách này)
  const [artistStack, setArtistStack] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState<'All' | 'Tracks' | 'Albums' | 'Artists'>('All');

  const seeAllArtists = () => {
    setSearchQuery('');
    setSearchFilter('Artists');
    navigateTo('SearchResults');
  };

  const seeAllAlbums = () => {
    setSearchQuery('');
    setSearchFilter('Albums');
    navigateTo('SearchResults');
  };

  const seeAllCharts = () => {
    setSearchQuery('');
    setSearchFilter('Tracks');
    navigateTo('SearchResults');
  };
  const navigateTo = (screen: ScreenId) => {
    setHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const finishAuth = (defaultScreen: ScreenId) => {
    navigateTo(afterAuth ?? defaultScreen);
    setAfterAuth(null);
  };

  const openLoginThenProfile = () => {
    setAfterAuth('Profile');
    navigateTo('Login');
  };

  const openPlaylist = (playlist: Playlist | null) => {
    setSelectedPlaylist(playlist);
    navigateTo('PlaylistDetails');
  };

  const openAlbum = (album: Album) => {
    const albumPlaylist: Playlist = {
      id: album.id,
      ownerId: 'album',
      title: album.title,
      description: `Album • ${album.artist}`,
      coverImage: album.coverImage,
      songIds: getAlbumSongIds(album),
    };
    setSelectedPlaylist(albumPlaylist);
    navigateTo('PlaylistDetails');
  };

  const openChart = (chartId: string) => {
    const chart = CHARTS.find((c) => c.id === chartId);
    if (!chart) {
      setSelectedPlaylist(null);
      navigateTo('PlaylistDetails');
      return;
    }
    const chartPlaylist: Playlist = {
      id: chart.id,
      ownerId: 'chart',
      title: `${chart.title} - ${chart.subtitle}`,
      description: chart.updateText,
      coverImage: chart.coverImage,
      songIds: getChartSongIds(chart.id),
    };
    setSelectedPlaylist(chartPlaylist);
    navigateTo('PlaylistDetails');
  };

  const openArtist = (artistId?: string) => {
    if (artistId) setArtistStack((prev) => [...prev, artistId]);
    navigateTo('ArtistProfile');
  };

  const openComments = (postId: string) => {
    setSelectedPostId(postId);
    navigateTo('FeedComments');
  };

  // Màn nằm dưới sheet bình luận: màn gần nhất trong lịch sử, bỏ qua sheet và các màn đăng nhập
  const commentsBaseIndex = history.findLastIndex(
    (screen) => screen !== 'FeedComments' && screen !== 'Login' && screen !== 'SignUp'
  );
  const commentsBaseScreen: ScreenId = commentsBaseIndex >= 0 ? history[commentsBaseIndex] : 'Feed';

  const closeComments = () => {
    setHistory(commentsBaseIndex >= 0 ? history.slice(0, commentsBaseIndex + 1) : ['Feed']);
    setCurrentScreen(commentsBaseScreen);
  };

  const openLoginThenReturn = (screen: ScreenId) => {
    setAfterAuth(screen);
    navigateTo('Login');
  };

  const handleLogout = () => {
    logout();
    setArtistStack([]);
    setLibraryTag('Playlists');
    setHistory(['Launch']);
    setCurrentScreen('Launch');
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentScreen(prevScreen);
    } else {
      setCurrentScreen('Home');
    }
  };

  const handleTabPress = (tab: TabName) => {
    switch (tab) {
      case 'Home':
        navigateTo('Home');
        break;
      case 'Search':
        navigateTo('SearchResults');
        break;
      case 'Feed':
        navigateTo('Feed');
        break;
      case 'Library':
        navigateTo('MyLibrary');
        break;
    }
  };

  const isCommentsOpen = currentScreen === 'FeedComments';
  // Khi mở sheet, màn phía dưới vẫn được giữ nguyên (không mất vị trí đang cuộn)
  const visibleScreen = isCommentsOpen ? commentsBaseScreen : currentScreen;

  const renderScreen = () => {
    switch (visibleScreen) {
      case 'Launch':
        return (
          <LaunchScreen
            onNavigateToSignUp={() => navigateTo('SignUp')}
            onNavigateToLogin={() => navigateTo('Login')}
          />
        );

      case 'Login':
        return (
          <LoginScreen
            onBack={() => {
              setAfterAuth(null);
              goBack();
            }}
            onLoginSuccess={() => finishAuth('Home')}
            onNavigateToSignUp={() => navigateTo('SignUp')}
          />
        );

      case 'SignUp':
        return (
          <SignUpScreen
            onBack={goBack}
            onSignUpSuccess={() => finishAuth('LaunchPremium')}
            onNavigateToLogin={() => navigateTo('Login')}
          />
        );

      case 'LaunchPremium':
        return (
          <LaunchScreenPremium
            onNavigateToSubscription={() => navigateTo('SubscriptionPlans')}
          />
        );

      case 'SubscriptionPlans':
        return (
          <SubscriptionPlansScreen
            onBackHome={() => navigateTo('Home')}
            onSubscribe={() => navigateTo('Home')}
            onRequireLogin={() => {
              setAfterAuth('SubscriptionPlans');
              navigateTo('Login');
            }}
          />
        );

      case 'Home':
        return (
          <HomeScreen
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onNavigateToPlaylist={() => openPlaylist(null)}
            onNavigateToChart={openChart}
            onNavigateToAlbum={openAlbum}
            onNavigateToArtist={openArtist}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onNavigateToLogin={() => navigateTo('Login')}
            onNavigateToProfile={() => (currentUser ? navigateTo('Profile') : openLoginThenProfile())}
            onLogout={handleLogout}
            onTabPress={handleTabPress}
          />
        );

      case 'Profile':
        return (
          <ProfileScreen
            onBack={goBack}
            onNavigateToPlans={() => navigateTo('SubscriptionPlans')}
            onNavigateToLogin={openLoginThenProfile}
          />
        );

      case 'SearchAudio':
      return (
      <SearchAudioScreen
         onSelectSuggestion={(selectedText) => {
        setSearchQuery(selectedText); 
        navigateTo('SearchResults');  
      }}
      onBack={goBack}
    />
  );

      case 'SearchResults':
  return (
    <SearchResultsScreen
      searchQuery={searchQuery} // Truyền từ khóa sang!
      onBackToSuggestions={() => navigateTo('SearchAudio')}
      onNavigateToArtist={openArtist}
      onNavigateToPlay={() => navigateTo('PlayAudio')}
      onNavigateToAlbum={openAlbum}
      onTabPress={handleTabPress}
    />
  );

      case 'Feed':
        return (
          <FeedScreen
            onOpenComments={openComments}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onRequireLogin={() => openLoginThenReturn('Feed')}
            onTabPress={handleTabPress}
          />
        );

      case 'MyLibrary':
        return (
          <MyLibraryScreen
            selectedTag={libraryTag}
            onSelectTag={setLibraryTag}
            onSelectPlaylist={openPlaylist}
            onSelectAlbum={openAlbum}
            onSelectArtist={openArtist}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onNavigateToLogin={() => {
              setAfterAuth('MyLibrary');
              navigateTo('Login');
            }}
            onTabPress={handleTabPress}
          />
        );

      case 'PlaylistDetails':
        return (
          <PlaylistDetailsScreen
            playlist={selectedPlaylist}
            onBack={goBack}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'ArtistProfile':
        return (
          <ArtistProfileScreen
            key={artistStack[artistStack.length - 1]}
            artistId={artistStack[artistStack.length - 1]}
            onSelectArtist={openArtist}
            onSelectAlbum={openAlbum}
            onBack={() => {
              setArtistStack((prev) => prev.slice(0, -1));
              goBack();
            }}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'PlayAudio':
        return (
          <PlayAudioScreen
            onMinimize={goBack}
            onOpenComments={openComments}
          />
        );

      default:
        return (
          <HomeScreen
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onNavigateToPlaylist={() => openPlaylist(null)}
            onNavigateToArtist={openArtist}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );
    }
  };

  const hiddenMiniPLayer = visibleScreen === 'Login' || visibleScreen === 'SignUp' || visibleScreen === 'Profile' || visibleScreen === 'Launch' || visibleScreen === 'LaunchPremium' || visibleScreen === 'SubscriptionPlans'||visibleScreen === "PlayAudio" || visibleScreen === 'SearchAudio';;
  return (
    <View style={styles.container}>
      {renderScreen()}

      {!hiddenMiniPLayer && (
        <MiniPlayer onPress={() => navigateTo('PlayAudio')} />
      )}

      {isCommentsOpen && (
        <FeedCommentsScreen
          postId={selectedPostId}
          onClose={closeComments}
          onRequireLogin={() => openLoginThenReturn('FeedComments')}
        />
      )}

      {/* Floating Screen Switcher */}
      <ScreenSwitcher
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => {
          if (screenId === 'PlaylistDetails') setSelectedPlaylist(null);
          if (screenId === 'FeedComments') setSelectedPostId(null);
          if (screenId === 'ArtistProfile') setArtistStack([]);
          setHistory((prev) => [...prev, screenId]);
          setCurrentScreen(screenId);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
