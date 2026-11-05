import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './app/Navigation';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AudioPlayerProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
