import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IMAGES } from '../../src/constants/images';

interface SubscriptionPlansScreenProps {
  onBackHome?: () => void;
  onSubscribe?: () => void;
}

export const SubscriptionPlansScreen: React.FC<SubscriptionPlansScreenProps> = ({
  onBackHome,
  onSubscribe,
}) => {
  const perks = [
    'Ad-free listening',
    'Download to listen offline',
    'Access full catalog Premium',
    'High sound quality',
    'Cancel anytime',
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={IMAGES.subscriptionBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header Title */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Unlimited</Text>
            <Text style={styles.headerTitle}>music selections</Text>
          </View>

          {/* Cards Carousel Area */}
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              decelerationRate="fast"
              snapToInterval={310}
            >
              {/* Premium Plan Card */}
              <View style={styles.card}>
                <Text style={styles.planName}>Premium</Text>

                <View style={styles.priceRow}>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free for 1 month</Text>
                  </View>
                  <Text style={styles.priceText}>$12.99/ month</Text>
                </View>

                {/* Features list */}
                <View style={styles.featuresList}>
                  {perks.map((perk, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#7B2CBF"
                        style={styles.checkIcon}
                      />
                      <Text style={styles.featureText}>{perk}</Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe button */}
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={onSubscribe || onBackHome}
                  activeOpacity={0.85}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe now</Text>
                </TouchableOpacity>
              </View>

              {/* Second Card (peek on right) */}
              <View style={[styles.card, styles.secondCard]}>
                <Text style={styles.planName}>Family</Text>
                <View style={styles.priceRow}>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Up to 6 accounts</Text>
                  </View>
                  <Text style={styles.priceText}>$19.99/ month</Text>
                </View>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={18} color="#7B2CBF" style={styles.checkIcon} />
                    <Text style={styles.featureText}>6 individual accounts</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={18} color="#7B2CBF" style={styles.checkIcon} />
                    <Text style={styles.featureText}>Block explicit music</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={18} color="#7B2CBF" style={styles.checkIcon} />
                    <Text style={styles.featureText}>Ad-free listening</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={onSubscribe || onBackHome}
                  activeOpacity={0.85}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Pagination dots */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>

          {/* Back home button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={onBackHome}
              activeOpacity={0.7}
              style={styles.backHomeButton}
            >
              <Text style={styles.backHomeText}>Back home</Text>
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
    backgroundColor: '#6A0572',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  carouselContainer: {
    height: 400,
  },
  scrollContent: {
    paddingHorizontal: 28,
    gap: 16,
    alignItems: 'center',
  },
  card: {
    width: 295,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  secondCard: {
    opacity: 0.95,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  freeBadge: {
    backgroundColor: '#F3F0FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111216',
  },
  featuresList: {
    gap: 14,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  subscribeButton: {
    backgroundColor: '#121316',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  backHomeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
