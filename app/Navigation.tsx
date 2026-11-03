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
import { MyLibraryScreen } from './screens/MyLibraryScreen';
import { MyPlaylistsScreen } from './screens/MyPlaylistsScreen';
import { PlaylistDetailsScreen } from './screens/PlaylistDetailsScreen';
import { ArtistProfileScreen } from './screens/ArtistProfileScreen';
import { PlayAudioScreen } from './screens/PlayAudioScreen';
import {MiniPlayer} from "../src/components/MiniPlayer";
export const Navigation: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('Home');
  const [history, setHistory] = useState<ScreenId[]>(['Home']);

  const navigateTo = (screen: ScreenId) => {
    setHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
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
            onNavigateToHome={() => navigateTo('Home')}
            onNavigateToPremium={() => navigateTo('LaunchPremium')}
          />
        );

      case 'LaunchPremium':
        return (
          <LaunchScreenPremium
            onStartListening={() => navigateTo('Home')}
            onNavigateToSubscription={() => navigateTo('SubscriptionPlans')}
          />
        );

      case 'SubscriptionPlans':
        return (
          <SubscriptionPlansScreen
            onBackHome={() => navigateTo('Home')}
            onSubscribe={() => navigateTo('Home')}
          />
        );

      case 'Home':
        return (
          <HomeScreen
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onNavigateToPlaylist={() => navigateTo('PlaylistDetails')}
            onNavigateToArtist={() => navigateTo('ArtistProfile')}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'SearchAudio':
        return (
          <SearchAudioScreen
            onSelectSuggestion={() => navigateTo('SearchResults')}
            onBack={goBack}
          />
        );

      case 'SearchResults':
        return (
          <SearchResultsScreen
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
            onNavigateToPlaylists={() => navigateTo('MyPlaylists')}
            onNavigateToPlaylistDetails={() => navigateTo('PlaylistDetails')}
            onNavigateToArtist={() => navigateTo('ArtistProfile')}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onNavigateToSearch={() => navigateTo('SearchAudio')}
            onTabPress={handleTabPress}
          />
        );

      case 'MyPlaylists':
        return (
          <MyPlaylistsScreen
            onBack={goBack}
            onSelectPlaylist={() => navigateTo('PlaylistDetails')}
            onTabPress={handleTabPress}
          />
        );

      case 'PlaylistDetails':
        return (
          <PlaylistDetailsScreen
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
            onNavigateToPlaylist={() => navigateTo('PlaylistDetails')}
            onNavigateToArtist={() => navigateTo('ArtistProfile')}
            onNavigateToPlay={() => navigateTo('PlayAudio')}
            onTabPress={handleTabPress}
          />
        );
    }
  };

  const hiddenMiniPLayer = currentScreen === 'Launch' || currentScreen === 'LaunchPremium' || currentScreen === 'SubscriptionPlans'||currentScreen === "PlayAudio";
  return (
    <View style={styles.container}>
      {renderScreen()}

      {!hiddenMiniPLayer && (
        <MiniPlayer onPress={() => navigateTo('PlayAudio')} />
      )}

      {/* Floating 13-Screen Switcher */}
      <ScreenSwitcher
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => {
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
