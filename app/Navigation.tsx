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
import { ArtistRequestScreen } from './screens/ArtistRequestScreen';
import { ArtistRequestStatusScreen } from './screens/ArtistRequestStatusScreen';
import { ArtistStudioScreen } from './screens/ArtistStudioScreen';
import { UploadSongScreen } from './screens/UploadSongScreen';
import { StudioSongsScreen } from './screens/StudioSongsScreen';
import { EditSongScreen } from './screens/EditSongScreen';
import { StudioAlbumsScreen } from './screens/StudioAlbumsScreen';
import { EditAlbumScreen } from './screens/EditAlbumScreen';
import { EditArtistPageScreen } from './screens/EditArtistPageScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SongStatsScreen } from './screens/SongStatsScreen';
import { InsightScreen } from './screens/InsightScreen';
import { AssistantScreen } from './screens/AssistantScreen';
import { PaymentHistoryScreen } from './screens/PaymentHistoryScreen';
import { setPlaySource, sourceForScreen } from '../src/utils/playSource';
import { refreshHiddenContent } from '../src/services/hiddenContent';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminAccountScreen } from './screens/AdminAccountScreen';
import { AdminReviewHistoryScreen } from './screens/AdminReviewHistoryScreen';
import { AdminEditAccountScreen } from './screens/AdminEditAccountScreen';
import { AdminTab } from '../src/components/AdminShell';
import { AdminRequestsScreen } from './screens/AdminRequestsScreen';
import { AdminRequestDetailScreen } from './screens/AdminRequestDetailScreen';
import { AdminManageScreen, ManageSegment } from './screens/AdminManageScreen';
import { AdminUserDetailScreen } from './screens/AdminUserDetailScreen';
import { AdminArtistDetailScreen } from './screens/AdminArtistDetailScreen';
import { AdminReportDetailScreen } from './screens/AdminReportDetailScreen';
import { ArtistRequestForm } from '../src/utils/artistRequest';
import { AIChatScreen } from './screens/AIChatScreen';
import { useAppRefresh } from '../src/context/RefreshContext';
import { AppNotification } from '../src/context/NotificationContext';
import { MiniPlayer } from "../src/components/MiniPlayer";
import { useAuth } from '../src/context/AuthContext';
import { useAudioPlayer } from '../src/context/AudioPlayerContext';
import { registerSongs } from '../src/data/songRegistry';
import { api as appApi } from '../src/services/api';
import { AccessProvider } from '../src/context/AccessContext';
import { setSessionExpiredHandler } from '../src/services/api';
import { Album, Artist, ARTISTS, CHARTS, getAlbumSongIds, getChartSongIds, Playlist } from '../src/data/musicData';
export const Navigation: React.FC = () => {
  const { currentUser, logout, reloadAccount } = useAuth();
  const { playSong } = useAudioPlayer();
  // Màn "bài đăng của một nghệ sĩ" (My posts / See all posts)
  const [postsArtist, setPostsArtist] = useState<{ id: string; name: string } | null>(null);
  const openArtistPosts = (id: string, name: string) => {
    setPostsArtist({ id, name });
    navigateTo('ArtistPosts');
  };
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
  // Dữ liệu điền sẵn cho form đăng ký nghệ sĩ (khi sửa và gửi lại sau khi bị từ chối)
  const [artistDraft, setArtistDraft] = useState<Partial<ArtistRequestForm> | null>(null);
  // Yêu cầu nghệ sĩ Admin đang xem
  const [adminRequestId, setAdminRequestId] = useState<string | null>(null);
  // Tab Manage của Admin (giai đoạn 5): loại đang xem và đối tượng đang mở
  const [manageSegment, setManageSegment] = useState<ManageSegment>('users');
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminArtistId, setAdminArtistId] = useState<string | null>(null);
  const [adminReport, setAdminReport] = useState<{ type: string; id: string } | null>(null);
  // Artist Studio: bài hát / album đang sửa (album null = tạo mới)
  const [editSongId, setEditSongId] = useState<string | null>(null);
  const [editAlbumId, setEditAlbumId] = useState<string | null>(null);
  // Artist Studio: bài hát đang xem thống kê
  const [statsSongId, setStatsSongId] = useState<string | null>(null);
  const openSongStats = (id: string) => {
    setStatsSongId(id);
    navigateTo('SongStats');
  };
  // AI Assistant (giai đoạn 6b): cuộc trò chuyện đang mở + bản phân tích đang xem đầy đủ
  const [assistantChatId, setAssistantChatId] = useState<string | null>(null);
  const [reportInsightId, setReportInsightId] = useState<string | null>(null);

  // Giai đoạn 5: trang nghệ sĩ / bài hát bị ẩn – tải khi mở app, khi làm mới và khi đổi tài khoản
  useEffect(() => {
    refreshHiddenContent();
  }, [refreshKey, currentUser?.id]);

  // Nguồn lượt nghe = màn đang mở lúc người dùng bấm phát (màn phát nhạc giữ nguồn cũ)
  useEffect(() => {
    setPlaySource(sourceForScreen(currentScreen, selectedPlaylist?.ownerId));
  }, [currentScreen, selectedPlaylist]);

  // Thay màn hiện tại bằng màn khác (VD tải bài xong mở "My songs", nút Back không quay lại form tải)
  const replaceCurrent = (screen: ScreenId) => {
    setHistory((prev) => [...prev.slice(0, -1), screen]);
    setCurrentScreen(screen);
  };

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

  // Bỏ các màn của luồng đăng ký nghệ sĩ khỏi lịch sử rồi mở màn mới
  // (VD gửi form xong thì nút Back ở màn trạng thái quay về Profile, không quay lại form)
  const replaceArtistFlow = (screen: ScreenId) => {
    setHistory((prev) => [...prev.filter((s) => s !== 'ArtistRequest' && s !== 'ArtistRequestStatus'), screen]);
    setCurrentScreen(screen);
  };

  const openArtistRequestForm = (draft: Partial<ArtistRequestForm> | null = null) => {
    setArtistDraft(draft);
    replaceArtistFlow('ArtistRequest');
  };

  const openMyArtistPage = () => {
    if (currentUser?.artistId) openArtist(currentUser.artistId);
  };

  // Bấm thông báo: chuyển tới trang Feed, cuộn tới bài đăng, mở bảng bình luận của bài đó
  // và nháy sáng bình luận được trả lời cùng câu trả lời mới (không phát nhạc).
  // Thông báo kết quả đăng ký nghệ sĩ: tải lại tài khoản (nhận role mới) rồi mở màn trạng thái.
  const openNotification = (notification: AppNotification) => {
    if (notification.type === 'artist_request_approved' || notification.type === 'artist_request_rejected') {
      reloadAccount();
      navigateTo('ArtistRequestStatus');
      return;
    }
    // Giai đoạn 5: nội dung bị gỡ thì không còn gì để mở; trang nghệ sĩ bị ẩn / hiện lại → mở Artist Studio
    if (notification.type === 'content_removed') return;
    if (notification.type === 'artist_page_hidden' || notification.type === 'artist_page_restored') {
      navigateTo('ArtistStudio');
      return;
    }
    // Nghệ sĩ mình theo dõi đăng bài: mở Feed và cuộn tới bài (không mở bình luận)
    if (notification.type === 'artist_new_post') {
      setFocusPostId(notification.postId);
      navigateTo('Feed');
      return;
    }
    // Nghệ sĩ ra bài hát mới: phát bài đó luôn
    if (notification.type === 'artist_new_song') {
      if (!notification.songId) return;
      appApi.songs
        .getByIds([notification.songId])
        .then((res: any) => {
          const song = Array.isArray(res?.data) ? res.data[0] : null;
          if (!song) return;
          registerSongs([song]);
          playSong(song, [song]);
          navigateTo('PlayAudio');
        })
        .catch(() => {});
      return;
    }
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
    setSessionExpiredHandler((message?: string) => {
      handleLogout();
      setLoginNotice(message || 'Your session has expired. Please log in again.');
      setHistory(['Launch', 'Login']);
      setCurrentScreen('Login');
    });
    return () => setSessionExpiredHandler(null);
  });

  // ---- Khu Admin riêng: tài khoản admin chỉ dùng các màn này (không có phần nghe nhạc)
  const ADMIN_SCREENS: ScreenId[] = [
    'AdminDashboard', 'AdminRequests', 'AdminRequestDetail', 'AdminAccount', 'AdminReviewHistory', 'AdminEditInfo', 'AdminEditPassword',
    'AdminManage', 'AdminUserDetail', 'AdminArtistDetail', 'AdminReportDetail',
  ];
  const AUTH_SCREENS: ScreenId[] = ['Launch', 'Login', 'SignUp'];
  const isAdminUser = currentUser?.role === 'admin';

  // Sau khi đăng nhập, tự chuyển giao diện theo vai trò:
  // admin -> Dashboard của khu Admin; tài khoản khác lỡ ở màn admin -> Home nghe nhạc
  useEffect(() => {
    if (!currentUser || AUTH_SCREENS.includes(currentScreen)) return;
    const onAdminScreen = ADMIN_SCREENS.includes(currentScreen);
    if (isAdminUser && !onAdminScreen) {
      setHistory(['AdminDashboard']);
      setCurrentScreen('AdminDashboard');
    } else if (!isAdminUser && onAdminScreen) {
      setHistory(['Home']);
      setCurrentScreen('Home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminUser, currentScreen, currentUser?.id]);

  // Chuyển tab trong khu Admin: mỗi tab là một "gốc", nút Back ở màn con quay về tab đó
  const handleAdminTab = (tab: AdminTab) => {
    const screen: ScreenId =
      tab === 'dashboard' ? 'AdminDashboard' : tab === 'requests' ? 'AdminRequests' : tab === 'manage' ? 'AdminManage' : 'AdminAccount';
    setHistory([screen]);
    setCurrentScreen(screen);
  };

  const openAdminRequest = (id: string) => {
    setAdminRequestId(id);
    navigateTo('AdminRequestDetail');
  };
  const openAdminUser = (id: string) => {
    setAdminUserId(id);
    navigateTo('AdminUserDetail');
  };
  const openAdminArtist = (id: string) => {
    setAdminArtistId(id);
    navigateTo('AdminArtistDetail');
  };
  const openAdminReport = (type: string, id: string) => {
    setAdminReport({ type, id });
    navigateTo('AdminReportDetail');
  };
  const seeAllReports = () => {
    setManageSegment('reports');
    handleAdminTab('manage');
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
            onOpenWallet={() => navigateTo('PaymentHistory')}
            onRequireLogin={() => {
              setAfterAuth('SubscriptionPlans');
              navigateTo('Login');
            }}
          />
        );

      case 'Home':
        return (
          <HomeScreen
            onNavigateToAIChat={() => navigateTo('AIChat')}
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

      case 'AIChat':
        return (
          <AIChatScreen
            onBack={goBack}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
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
            onBecomeArtist={() => openArtistRequestForm(null)}
            onOpenRequestStatus={() => navigateTo('ArtistRequestStatus')}
            onOpenStudio={() => navigateTo('ArtistStudio')}
            onOpenMyArtistPage={openMyArtistPage}
            onOpenPayments={() => navigateTo('PaymentHistory')}
          />
        );

      case 'ArtistRequest':
        return (
          <ArtistRequestScreen
            initial={artistDraft}
            onBack={goBack}
            onSubmitted={() => {
              setArtistDraft(null);
              replaceArtistFlow('ArtistRequestStatus');
            }}
          />
        );

      case 'ArtistRequestStatus':
        return (
          <ArtistRequestStatusScreen
            onBack={goBack}
            onBecomeArtist={() => openArtistRequestForm(null)}
            onEditResubmit={(draft) => openArtistRequestForm(draft)}
            onOpenStudio={() => navigateTo('ArtistStudio')}
          />
        );

      case 'ArtistStudio':
        return (
          <ArtistStudioScreen
            onBack={goBack}
            onUpload={() => navigateTo('UploadSong')}
            onOpenSongs={() => navigateTo('StudioSongs')}
            onOpenAlbums={() => navigateTo('StudioAlbums')}
            onEditPage={() => navigateTo('EditArtistPage')}
            onViewPage={(id) => openArtist(id)}
            onOpenPosts={openArtistPosts}
            onOpenStats={() => navigateTo('StudioStats')}
            onOpenInsight={() => navigateTo('StudioAssistant')}
          />
        );

      case 'StudioStats':
        return (
          <StatsScreen
            onBack={goBack}
            onOpenSong={openSongStats}
            onUpload={() => navigateTo('UploadSong')}
            onPostToFeed={() => navigateTo('Feed')}
          />
        );

      case 'StudioAssistant':
        return (
          <AssistantScreen
            chatId={assistantChatId}
            onChatChange={setAssistantChatId}
            onBack={goBack}
            onOpenWallet={() => navigateTo('PaymentHistory')}
            onOpenReport={(id) => {
              setReportInsightId(id);
              navigateTo('StudioInsight');
            }}
          />
        );

      case 'StudioInsight':
        return <InsightScreen insightId={reportInsightId} onBack={goBack} />;

      case 'PaymentHistory':
        return <PaymentHistoryScreen onBack={goBack} />;

      case 'SongStats':
        return <SongStatsScreen songId={statsSongId} onBack={goBack} />;

      case 'UploadSong':
        return <UploadSongScreen onClose={goBack} onViewSongs={() => replaceCurrent('StudioSongs')} />;

      case 'StudioSongs':
        return (
          <StudioSongsScreen
            onBack={goBack}
            onUpload={() => navigateTo('UploadSong')}
            onEditSong={(id) => {
              setEditSongId(id);
              navigateTo('EditSong');
            }}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onOpenStats={openSongStats}
          />
        );

      case 'EditSong':
        return <EditSongScreen key={editSongId ?? 'none'} songId={editSongId} onBack={goBack} onDone={goBack} />;

      case 'StudioAlbums':
        return (
          <StudioAlbumsScreen
            onBack={goBack}
            onEditAlbum={(id) => {
              setEditAlbumId(id);
              navigateTo('EditAlbum');
            }}
          />
        );

      case 'EditAlbum':
        return <EditAlbumScreen key={editAlbumId ?? 'new'} albumId={editAlbumId} onBack={goBack} onSaved={goBack} />;

      case 'EditArtistPage':
        return <EditArtistPageScreen onBack={goBack} />;

      case 'AdminDashboard':
        return (
          <AdminDashboardScreen
            onTabPress={handleAdminTab}
            onOpenRequest={openAdminRequest}
            onOpenReport={openAdminReport}
            onSeeReports={seeAllReports}
          />
        );

      case 'AdminManage':
        return (
          <AdminManageScreen
            key={manageSegment}
            segment={manageSegment}
            onSegmentChange={setManageSegment}
            onTabPress={handleAdminTab}
            onOpenUser={openAdminUser}
            onOpenArtist={openAdminArtist}
            onOpenReport={openAdminReport}
          />
        );

      case 'AdminUserDetail':
        return <AdminUserDetailScreen key={adminUserId ?? 'none'} userId={adminUserId} onBack={goBack} onOpenArtist={openAdminArtist} />;

      case 'AdminArtistDetail':
        return <AdminArtistDetailScreen key={adminArtistId ?? 'none'} artistId={adminArtistId} onBack={goBack} onOpenUser={openAdminUser} />;

      case 'AdminReportDetail':
        return (
          <AdminReportDetailScreen
            key={adminReport ? `${adminReport.type}:${adminReport.id}` : 'none'}
            targetType={adminReport?.type ?? null}
            targetId={adminReport?.id ?? null}
            onBack={goBack}
            onOpenUser={openAdminUser}
          />
        );

      case 'AdminRequests':
        return <AdminRequestsScreen onTabPress={handleAdminTab} onOpenRequest={openAdminRequest} />;

      case 'AdminAccount':
        return (
          <AdminAccountScreen
            onTabPress={handleAdminTab}
            onEditInfo={() => navigateTo('AdminEditInfo')}
            onChangePassword={() => navigateTo('AdminEditPassword')}
            onOpenHistory={() => navigateTo('AdminReviewHistory')}
            onLogout={handleLogout}
          />
        );

      case 'AdminReviewHistory':
        return <AdminReviewHistoryScreen onBack={goBack} onOpenRequest={openAdminRequest} />;

      case 'AdminEditInfo':
        return <AdminEditAccountScreen mode="info" onBack={goBack} />;

      case 'AdminEditPassword':
        return <AdminEditAccountScreen mode="password" onBack={goBack} />;

      case 'AdminRequestDetail':
        return (
          <AdminRequestDetailScreen
            key={adminRequestId ?? 'none'}
            requestId={adminRequestId}
            onBack={goBack}
            onReviewed={goBack}
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
            onDiscoverArtists={() => navigateTo('ArtistsList')}
          />
        );

      case 'ArtistPosts':
        return (
          <FeedScreen
            filterArtistId={postsArtist?.id || currentUser?.artistId || null}
            title={postsArtist && postsArtist.id !== currentUser?.artistId ? `${postsArtist.name} · Posts` : 'My posts'}
            onBack={goBack}
            onOpenComments={openComments}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onRequireLogin={() => openLoginThenReturn('ArtistPosts')}
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
            onOpenPosts={openArtistPosts}
            onOpenComments={openComments}
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

  // Ẩn mini player ở các màn đăng nhập / tài khoản và các màn có nút hành động ở cuối màn hình
  const SCREENS_WITHOUT_MINI_PLAYER: ScreenId[] = [
    'Login', 'SignUp', 'Profile', 'Launch', 'LaunchPremium', 'SubscriptionPlans', 'PlayAudio',
    'ArtistRequest', 'ArtistRequestStatus', 'AdminDashboard', 'AdminRequests', 'AdminRequestDetail',
    'AdminAccount', 'AdminReviewHistory', 'AdminEditInfo', 'AdminEditPassword',
    'AdminManage', 'AdminUserDetail', 'AdminArtistDetail', 'AdminReportDetail',
    'ArtistStudio', 'UploadSong', 'EditSong', 'StudioAlbums', 'EditAlbum', 'EditArtistPage', 'StudioStats', 'SongStats',
    'StudioInsight', 'StudioAssistant', 'PaymentHistory', 'AIChat',
  ];
  const hiddenMiniPLayer = SCREENS_WITHOUT_MINI_PLAYER.includes(visibleScreen);
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
