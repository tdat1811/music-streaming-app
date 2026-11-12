import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenSwitcher, ScreenId } from '../src/components/ScreenSwitcher';
import { TabName } from '../src/components/BottomTabBar';

// All 13 Screens
import { LaunchScreen } from './screens/LaunchScreen';
import { LaunchScreenPremium } from './screens/LaunchScreenPremium';
import { SubscriptionPlansScreen } from './screens/SubscriptionPlansScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchResultsScreen } from './screens/SearchResultsScreen';
import { FeedScreen } from './screens/FeedScreen';
import { FeedCommentsScreen } from './screens/FeedCommentsScreen';
import { MyLibraryScreen, LibraryTag } from './screens/MyLibraryScreen';
import { PlaylistDetailsScreen } from './screens/PlaylistDetailsScreen';
import { ChartsListScreen } from './screens/ChartsListScreen';
import { AlbumsListScreen } from './screens/AlbumsListScreen';
import { ArtistsListScreen } from './screens/ArtistsListScreen';
import { ArtistProfileScreen } from './screens/ArtistProfileScreen';
import { PlayAudioScreen } from './screens/PlayAudioScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { useAppRefresh } from '../src/context/RefreshContext';
import { AppNotification } from '../src/context/NotificationContext';
import {MiniPlayer} from "../src/components/MiniPlayer";
import { useAuth } from '../src/context/AuthContext';
import { AccessProvider } from '../src/context/AccessContext';
import { setSessionExpiredHandler } from '../src/services/api';
import { Album, Artist, ARTISTS, CHARTS, getAlbumSongIds, getChartSongIds, Playlist } from '../src/data/musicData';
export const Navigation: React.FC = () => {
  const { currentUser, logout } = useAuth();
  // Tăng sau mỗi lần làm mới ứng dụng -> dựng lại màn hình hiện tại để tải lại dữ liệu
  const { refreshKey } = useAppRefresh();
  // Bài đăng cần cuộn tới trên Feed khi mở từ thông báo
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  // Bình luận cần nháy sáng khi mở bảng bình luận từ một thông báo
  const [highlightCommentIds, setHighlightCommentIds] = useState<string[]>([]);
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
  const [artistCache, setArtistCache] = useState<Record<string, any>>({});
  const [searchFilter, setSearchFilter] = useState<'All' | 'Tracks' | 'Albums' | 'Artists'>('All');
  // Mở trang chọn gói từ hộp thoại "Nâng cấp VIP": mua xong thì quay lại màn hình đang dùng
  const [returnAfterPlans, setReturnAfterPlans] = useState(false);

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

  const openChart = (chartTarget: any) => {
    let chart: any = chartTarget;
    if (typeof chartTarget === 'string') {
      chart = CHARTS.find((c) => c.id === chartTarget);
    }
    if (!chart) {
      setSelectedPlaylist(null);
      navigateTo('PlaylistDetails');
      return;
    }
    const chartPlaylist: Playlist = {
      id: chart.id,
      ownerId: 'chart',
      title: chart.subtitle ? `${chart.title} • ${chart.subtitle}` : chart.title,
      description: chart.updateText || 'Daily chart-toppers update',
      coverImage: chart.coverImage,
      songIds: chart.songIds || getChartSongIds(chart.id) || [],
    };
    setSelectedPlaylist(chartPlaylist);
    navigateTo('PlaylistDetails');
  };

  const openArtist = (target?: string | any) => {
    if (!target) {
      navigateTo('ArtistProfile');
      return;
    }
    const id = typeof target === 'string' ? target : target.id;
    const artistObj =
      typeof target === 'object' && target.id
        ? target
        : ARTISTS.find((a) => a.id === id) || artistCache[id] || null;

    if (artistObj) {
      setArtistCache((prev) => ({ ...prev, [id]: artistObj }));
    }
    setArtistStack((prev) => [...prev, id]);
    navigateTo('ArtistProfile');
  };

  const openComments = (postId: string) => {
    setSelectedPostId(postId);
    setHighlightCommentIds([]);
    navigateTo('FeedComments');
  };

  // Bấm thông báo: chuyển tới trang Feed, cuộn tới bài đăng, mở bảng bình luận của bài đó
  // và nháy sáng bình luận được trả lời cùng câu trả lời mới (không phát nhạc)
  const openNotification = (notification: AppNotification) => {
    setSelectedPostId(notification.postId);
    setFocusPostId(notification.postId);
    setHighlightCommentIds(
      [notification.targetCommentId, notification.replyId].filter((id, i, arr) => !!id && arr.indexOf(id) === i)
    );
    setHistory((prev) => [...prev, 'Feed', 'FeedComments']);
    setCurrentScreen('FeedComments');
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

  const openPlansThenReturn = () => {
    setReturnAfterPlans(true);
    navigateTo('SubscriptionPlans');
  };

  const leavePlans = () => {
    if (returnAfterPlans) {
      setReturnAfterPlans(false);
      goBack();
    } else {
      navigateTo('Home');
    }
  };

  const handleLogout = () => {
    setReturnAfterPlans(false);
    logout();
    setArtistStack([]);
    setLibraryTag('Playlists');
    setHistory(['Launch']);
    setCurrentScreen('Launch');
  };

  // Máy chủ báo token hết hạn / không hợp lệ: đăng xuất rồi mở Log In kèm thông báo
  const [loginNotice, setLoginNotice] = useState('');
  useEffect(() => {
    setSessionExpiredHandler(() => {
      handleLogout();
      setLoginNotice('Your session has expired. Please log in again.');
      setHistory(['Launch', 'Login']);
      setCurrentScreen('Login');
    });
    return () => setSessionExpiredHandler(null);
  });

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
            notice={loginNotice}
            onBack={() => {
              setAfterAuth(null);
              setLoginNotice('');
              goBack();
            }}
            onLoginSuccess={() => {
              setLoginNotice('');
              finishAuth('Home');
            }}
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
            onBackHome={leavePlans}
            onSubscribe={leavePlans}
            onRequireLogin={() => {
              setAfterAuth('SubscriptionPlans');
              navigateTo('Login');
            }}
          />
        );

      case 'Home':
        return (
          <HomeScreen
            onNavigateToSearch={() => navigateTo('SearchResults')}
            onNavigateToPlaylist={() => openPlaylist(null)}
            onNavigateToChartsList={() => navigateTo('ChartsList')}
            onNavigateToAlbumsList={() => navigateTo('AlbumsList')}
            onNavigateToArtistsList={() => navigateTo('ArtistsList')}
            onNavigateToChart={openChart}
            onNavigateToAlbum={openAlbum}
            onNavigateToArtist={openArtist}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onNavigateToLogin={() => navigateTo('Login')}
            onNavigateToProfile={() => (currentUser ? navigateTo('Profile') : openLoginThenProfile())}
            onNavigateToPlans={() => navigateTo('SubscriptionPlans')}
            onNavigateToNotifications={() =>
              currentUser ? navigateTo('Notifications') : openLoginThenReturn('Notifications')
            }
            onLogout={handleLogout}
            onTabPress={handleTabPress}
          />
        );

      case 'Notifications':
        return (
          <NotificationsScreen
            onBack={goBack}
            onOpenNotification={openNotification}
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

      case 'SearchResults':
  return (
    <SearchResultsScreen
      searchQuery={searchQuery}
      onChangeQuery={setSearchQuery}
      onNavigateToArtist={openArtist}
      onNavigateToPlay={() => navigateTo('PlayAudio')}
      onNavigateToAlbum={openAlbum}
      onTabPress={handleTabPress}
    />
  );

      case 'Feed':
        return (
          <FeedScreen
            focusPostId={focusPostId}
            onFocusHandled={() => setFocusPostId(null)}
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
            onNavigateToSearch={() => navigateTo('SearchResults')}
            onNavigateToLogin={() => {
              setAfterAuth('MyLibrary');
              navigateTo('Login');
            }}
            onTabPress={handleTabPress}
          />
        );

      case 'ChartsList':
        return (
          <ChartsListScreen
            onBack={goBack}
            onSelectChart={(chart) => openChart(chart)}
            onTabPress={handleTabPress}
          />
        );

      case 'AlbumsList':
        return (
          <AlbumsListScreen
            onBack={goBack}
            onSelectAlbum={(album) => openAlbum(album)}
            onTabPress={handleTabPress}
          />
        );

      case 'ArtistsList':
        return (
          <ArtistsListScreen
            onBack={goBack}
            onSelectArtist={(artist) => openArtist(artist)}
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

      case 'ArtistProfile': {
        const curArtistId = artistStack[artistStack.length - 1];
        return (
          <ArtistProfileScreen
            key={curArtistId ?? 'default'}
            artistId={curArtistId}
            initialArtist={curArtistId ? artistCache[curArtistId] || ARTISTS.find((a) => a.id === curArtistId) || null : null}
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
      }

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
            onNavigateToSearch={() => navigateTo('SearchResults')}
            onNavigateToPlaylist={() => openPlaylist(null)}
            onNavigateToChartsList={() => navigateTo('ChartsList')}
            onNavigateToAlbumsList={() => navigateTo('AlbumsList')}
            onNavigateToArtistsList={() => navigateTo('ArtistsList')}
            onNavigateToChart={openChart}
            onNavigateToAlbum={openAlbum}
            onNavigateToArtist={openArtist}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );
    }
  };

  const hiddenMiniPLayer = visibleScreen === 'Login' || visibleScreen === 'SignUp' || visibleScreen === 'Profile' || visibleScreen === 'Launch' || visibleScreen === 'LaunchPremium' || visibleScreen === 'SubscriptionPlans'||visibleScreen === "PlayAudio";
  return (
    <AccessProvider
      onRequireLogin={() => openLoginThenReturn(currentScreen)}
      onOpenPlans={openPlansThenReturn}
    >
    <View style={styles.container}>
      <React.Fragment key={refreshKey}>{renderScreen()}</React.Fragment>

      {!hiddenMiniPLayer && (
        <MiniPlayer onPress={() => navigateTo('PlayAudio')} />
      )}

      {isCommentsOpen && (
        <FeedCommentsScreen
          postId={selectedPostId}
          highlightCommentIds={highlightCommentIds}
          onClose={() => {
            setHighlightCommentIds([]);
            closeComments();
          }}
          onRequireLogin={() => openLoginThenReturn('FeedComments')}
        />
      )}

      {/* Floating Screen Switcher */}
      <ScreenSwitcher
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => {
          if (screenId === 'PlaylistDetails') setSelectedPlaylist(null);
          if (screenId === 'FeedComments') {
            setSelectedPostId(null);
            setHighlightCommentIds([]);
          }
          if (screenId === 'ArtistProfile') setArtistStack([]);
          setHistory((prev) => [...prev, screenId]);
          setCurrentScreen(screenId);
        }}
      />
    </View>
    </AccessProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
