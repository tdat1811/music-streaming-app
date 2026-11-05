import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IMAGES } from '../../src/constants/images';

const HORIZONTAL_PADDING = 24;

const FEATURE_SLIDES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: 'ban-outline',
    title: 'Ad-free listening',
    description: 'Enjoy your music without any interruptions.',
  },
  {
    icon: 'download-outline',
    title: 'Offline downloads',
    description: 'Save your favorite tracks and listen anywhere.',
  },
  {
    icon: 'musical-notes-outline',
    title: 'Lossless audio',
    description: 'Hear every detail in the highest sound quality.',
  },
];

interface LaunchScreenPremiumProps {
  onNavigateToSubscription?: () => void;
}

export const LaunchScreenPremium: React.FC<LaunchScreenPremiumProps> = ({
  onNavigateToSubscription,
}) => {
  const { width } = useWindowDimensions();
  const pageWidth = width - HORIZONTAL_PADDING * 2;
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    scrollRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

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

            {/* Feature slides */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.slides}
            >
              {FEATURE_SLIDES.map((slide) => (
                <View key={slide.title} style={[styles.slide, { width: pageWidth }]}>
                  <Ionicons name={slide.icon} size={32} color="#FFFFFF" />
                  <Text style={styles.slideTitle}>{slide.title}</Text>
                  <Text style={styles.slideDescription}>{slide.description}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Pagination dots */}
            <View style={styles.paginationDots}>
              {FEATURE_SLIDES.map((slide, index) => (
                <TouchableOpacity
                  key={slide.title}
                  onPress={() => goToSlide(index)}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.dot,
                      index === activeSlide ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Action Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={onNavigateToSubscription}
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
    paddingHorizontal: HORIZONTAL_PADDING,
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
  slides: {
    flexGrow: 0,
    width: '100%',
    marginTop: 24,
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
  },
  slideDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
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
