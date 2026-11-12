import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './app/Navigation';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { AuthProvider } from './src/context/AuthContext';
import { FeedProvider } from './src/context/FeedContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { RefreshProvider } from './src/context/RefreshContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AudioPlayerProvider>
        <AuthProvider>
          <NotificationProvider>
            <FeedProvider>
              <RefreshProvider>
                <Navigation />
              </RefreshProvider>
            </FeedProvider>
          </NotificationProvider>
        </AuthProvider>
      </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
