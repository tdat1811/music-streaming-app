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
import { Playlist } from '../src/data/musicData';
export const Navigation: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('Launch');
  const [history, setHistory] = useState<ScreenId[]>(['Launch']);
   const [searchQuery, setSearchQuery] = useState<string>('me');
  // Màn hình cần quay lại sau khi đăng nhập (ví dụ khách bấm mua gói ở màn chọn gói)
  const [afterAuth, setAfterAuth] = useState<ScreenId | null>(null);
  // Giữ ở đây để không mất tag đang chọn khi quay lại từ màn Play hoặc Playlist Details
  const [libraryTag, setLibraryTag] = useState<LibraryTag>('Playlists');
  // null là playlist mẫu Top 50 - Canada
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
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

  const handleLogout = () => {
    logout();
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

  const renderScreen = () => {
    switch (currentScreen) {
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
            onNavigateToArtist={() => navigateTo('ArtistProfile')}
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
      onNavigateToArtist={() => navigateTo('ArtistProfile')}
      onNavigateToPlay={() => navigateTo('PlayAudio')}
      onTabPress={handleTabPress}
    />
  );

      case 'Feed':
        return (
          <FeedScreen
            onOpenComments={() => navigateTo('FeedComments')}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'FeedComments':
        return <FeedCommentsScreen onClose={goBack} />;

      case 'MyLibrary':
        return (
          <MyLibraryScreen
            selectedTag={libraryTag}
            onSelectTag={setLibraryTag}
            onSelectPlaylist={openPlaylist}
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
            onBack={goBack}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'PlayAudio':
        return (
          <PlayAudioScreen
            onMinimize={goBack}
            onOpenComments={() => navigateTo('FeedComments')}
          />
        );

      default:
        return (
          <HomeScreen
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onNavigateToPlaylist={() => openPlaylist(null)}
            onNavigateToArtist={() => navigateTo('ArtistProfile')}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );
    }
  };

  const hiddenMiniPLayer = currentScreen === 'Login' || currentScreen === 'SignUp' || currentScreen === 'Profile' || currentScreen === 'Launch' || currentScreen === 'LaunchPremium' || currentScreen === 'SubscriptionPlans'||currentScreen === "PlayAudio" || currentScreen === 'SearchAudio';;
  return (
    <View style={styles.container}>
      {renderScreen()}

      {!hiddenMiniPLayer && (
        <MiniPlayer onPress={() => navigateTo('PlayAudio')} />
      )}

      {/* Floating Screen Switcher */}
      <ScreenSwitcher
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => {
          if (screenId === 'PlaylistDetails') setSelectedPlaylist(null);
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
