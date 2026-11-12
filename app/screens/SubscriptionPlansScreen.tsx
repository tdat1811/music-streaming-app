import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IMAGES } from '../../src/constants/images';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../src/data/musicData';
import { FREE_PLAN_ID, useAuth } from '../../src/context/AuthContext';

// Chỉ cho chọn các gói VIP. Người dùng không mua gói nào thì mặc định là thành viên thường.
const VIP_PLANS = SUBSCRIPTION_PLANS.filter((plan) => plan.id !== FREE_PLAN_ID);

const CARD_WIDTH = 295;
const CARD_GAP = 16;
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP;
const PAYMENT_DURATION_MS = 1500;

type PaymentStep = 'confirm' | 'processing' | 'success';

interface SubscriptionPlansScreenProps {
  onBackHome?: () => void;
  onSubscribe?: () => void;
  onRequireLogin?: () => void;
}

export const SubscriptionPlansScreen: React.FC<SubscriptionPlansScreenProps> = ({
  onBackHome,
  onSubscribe,
  onRequireLogin,
}) => {
  const { currentUser, activePlan, subscribe } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paymentPlan, setPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('confirm');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (paymentTimer.current) clearTimeout(paymentTimer.current);
    };
  }, []);

  const selectPlan = (index: number) => {
    setSelectedIndex(index);
    scrollRef.current?.scrollTo({ x: index * CARD_INTERVAL, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_INTERVAL);
    setSelectedIndex(Math.min(index, VIP_PLANS.length - 1));
  };

  const startPayment = (plan: SubscriptionPlan, index: number) => {
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    selectPlan(index);
    setPaymentStep('confirm');
    setPaymentPlan(plan);
  };

  const closePayment = () => {
    if (paymentStep !== 'processing') setPaymentPlan(null);
  };

  // Mô phỏng thanh toán: không thu thông tin thẻ, không gọi dịch vụ nào
  const confirmPayment = () => {
    if (!paymentPlan) return;
    setPaymentStep('processing');
    paymentTimer.current = setTimeout(() => {
      subscribe(paymentPlan);
      setPaymentStep('success');
    }, PAYMENT_DURATION_MS);
  };

  const finishPayment = () => {
    setPaymentPlan(null);
    if (onSubscribe) onSubscribe();
  };

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
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              decelerationRate="fast"
              snapToInterval={CARD_INTERVAL}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {VIP_PLANS.map((plan, index) => {
                const isCurrent = activePlan?.id === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.card, index === selectedIndex && styles.cardSelected]}
                    onPress={() => selectPlan(index)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current plan</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.priceRow}>
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>{plan.badge}</Text>
                      </View>
                      <Text style={styles.priceText}>{plan.price}</Text>
                    </View>

                    {/* Features list */}
                    <View style={styles.featuresList}>
                      {plan.perks.map((perk) => (
                        <View key={perk} style={styles.featureItem}>
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
                      style={[styles.subscribeButton, isCurrent && styles.subscribeButtonDisabled]}
                      onPress={() => startPayment(plan, index)}
                      disabled={isCurrent}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.subscribeButtonText}>
                        {isCurrent ? 'Subscribed' : 'Subscribe now'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Pagination dots */}
          <View style={styles.dotsRow}>
            {VIP_PLANS.map((plan, index) => (
              <View
                key={plan.id}
                style={[
                  styles.dot,
                  index === selectedIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
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

      {/* Simulated payment dialog */}
      <Modal
        visible={paymentPlan !== null}
        transparent
        animationType="fade"
        onRequestClose={closePayment}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {paymentStep === 'confirm' && (
              <>
                <Text style={styles.modalTitle}>Confirm subscription</Text>
                <Text style={styles.modalPlan}>{paymentPlan?.name}</Text>
                <Text style={styles.modalPrice}>{paymentPlan?.price}</Text>
                <Text style={styles.modalAccount}>Account: {currentUser?.email}</Text>
                <Text style={styles.modalNote}>This is a demo. You will not be charged.</Text>
                <TouchableOpacity style={styles.subscribeButton} onPress={confirmPayment}>
                  <Text style={styles.subscribeButtonText}>Confirm payment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={closePayment}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStep === 'processing' && (
              <>
                <ActivityIndicator size="large" color="#7B2CBF" />
                <Text style={styles.modalProcessing}>Processing payment...</Text>
              </>
            )}

            {paymentStep === 'success' && (
              <>
                <Ionicons name="checkmark-circle" size={56} color="#7B2CBF" />
                <Text style={styles.modalTitle}>Payment successful</Text>
                <Text style={styles.modalNote}>
                  Your VIP account is unlocked with the {paymentPlan?.name} plan.
                </Text>
                <TouchableOpacity style={styles.subscribeButton} onPress={finishPayment}>
                  <Text style={styles.subscribeButtonText}>Start listening</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    gap: CARD_GAP,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 370,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardSelected: {
    borderColor: '#7B2CBF',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
  },
  currentBadge: {
    backgroundColor: '#7B2CBF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    flex: 1,
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
    alignSelf: 'stretch',
    backgroundColor: '#121316',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#9CA3AF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111216',
    textAlign: 'center',
    marginTop: 8,
  },
  modalPlan: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 16,
  },
  modalPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111216',
    marginTop: 4,
  },
  modalAccount: {
    fontSize: 13,
    color: '#686A70',
    textAlign: 'center',
    marginTop: 12,
  },
  modalNote: {
    fontSize: 13,
    color: '#686A70',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 20,
  },
  modalCancel: {
    paddingVertical: 12,
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#686A70',
  },
  modalProcessing: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111216',
    marginTop: 16,
  },
});
