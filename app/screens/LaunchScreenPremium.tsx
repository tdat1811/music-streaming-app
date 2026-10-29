import React from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/constants/images';

interface LaunchScreenPremiumProps {
  onStartListening?: () => void;
  onNavigateToSubscription?: () => void;
}

export const LaunchScreenPremium: React.FC<LaunchScreenPremiumProps> = ({
  onStartListening,
  onNavigateToSubscription,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={IMAGES.launchPremiumBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={IMAGES.launchPremiumLogo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Centered Title */}
          <View style={styles.centerContainer}>
            <Text style={styles.titleText}>Welcome to</Text>
            <Text style={styles.titleText}>Premium</Text>

            {/* Pagination dots */}
            <View style={styles.paginationDots}>
              <View style={[styles.dot, styles.dotInactive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotInactive]} />
            </View>
          </View>

          {/* Bottom Action Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={onStartListening || onNavigateToSubscription}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start listening</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoImage: {
    width: 60,
    height: 48,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  titleText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  bottomContainer: {
    width: '100%',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#121316',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
