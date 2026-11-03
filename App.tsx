import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './app/Navigation';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AudioPlayerProvider>
      <Navigation />
      </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
