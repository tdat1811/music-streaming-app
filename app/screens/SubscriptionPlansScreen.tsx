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
import { daysLeft, formatDate, nextExpiryDate } from '../../src/utils/plan';
import { formatMoney } from '../../src/utils/insights';

// Chỉ cho chọn các gói VIP. Người dùng không mua gói nào thì mặc định là thành viên thường.
const VIP_PLANS = SUBSCRIPTION_PLANS.filter((plan) => plan.id !== FREE_PLAN_ID);

const CARD_WIDTH = 295;
const CARD_GAP = 16;
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP;
const PAYMENT_DURATION_MS = 1500;

type PaymentStep = 'confirm' | 'processing' | 'success' | 'error';

interface SubscriptionPlansScreenProps {
  onBackHome?: () => void;
  onSubscribe?: () => void;
  onRequireLogin?: () => void;
  // Mở ví để nạp tiền (khi số dư không đủ mua gói)
  onOpenWallet?: () => void;
}

export const SubscriptionPlansScreen: React.FC<SubscriptionPlansScreenProps> = ({
  onBackHome,
  onSubscribe,
  onRequireLogin,
  onOpenWallet,
}) => {
  const { currentUser, activePlan, isVip, planExpiresAt, subscribe } = useAuth();
  // Gói VIP đã hết hạn (vẫn còn planId nhưng quá ngày hết hạn)
  const expiredPlanId = !isVip && planExpiresAt ? currentUser?.planId ?? null : null;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paymentPlan, setPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('confirm');
  const [paymentError, setPaymentError] = useState<{ message: string; lowBalance: boolean } | null>(null);
  const balance = currentUser?.balance ?? 0;
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

  // Thanh toán bằng số dư ví (VNĐ, nạp qua MoMo giả lập) – không thu thông tin thẻ
  const confirmPayment = () => {
    if (!paymentPlan) return;
    setPaymentError(null);
    setPaymentStep('processing');
    paymentTimer.current = setTimeout(async () => {
      const result = await subscribe(paymentPlan);
      if (result.ok) {
        setPaymentStep('success');
      } else {
        setPaymentError({ message: result.message || 'Payment failed. Please try again.', lowBalance: result.code === 'INSUFFICIENT_BALANCE' });
        setPaymentStep('error');
      }
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
                // Gói đang dùng và còn hạn: cho phép gia hạn thêm 1 tháng
                const isCurrent = isVip && activePlan?.id === plan.id;
                const isExpired = expiredPlanId === plan.id;
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

                    {isCurrent && (
                      <Text style={styles.expiryText}>
                        Expires on {formatDate(planExpiresAt)} ({daysLeft(planExpiresAt)} days left)
                      </Text>
                    )}
                    {isExpired && (
                      <Text style={[styles.expiryText, styles.expiredText]}>
                        Expired on {formatDate(planExpiresAt)}. Renew to unlock VIP again.
                      </Text>
                    )}

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
                      style={styles.subscribeButton}
                      onPress={() => startPayment(plan, index)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.subscribeButtonText}>
                        {isCurrent ? 'Renew +1 month' : isExpired ? 'Renew now' : 'Subscribe now'}
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
                <Text style={styles.modalAccount}>
                  Valid until{' '}
                  {formatDate(nextExpiryDate(isVip && activePlan?.id === paymentPlan?.id ? planExpiresAt : null))}
                </Text>
                <Text style={styles.modalAccount}>Wallet balance: {formatMoney(balance)}</Text>
                <Text style={styles.modalNote}>Paid from your wallet balance. Demo wallet – no real money is charged.</Text>
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

            {paymentStep === 'error' && (
              <>
                <Ionicons name="wallet-outline" size={52} color="#E11D48" />
                <Text style={styles.modalTitle}>{paymentError?.lowBalance ? 'Not enough balance' : 'Payment failed'}</Text>
                <Text style={styles.modalNote}>{paymentError?.message}</Text>
                {paymentError?.lowBalance && !!onOpenWallet && (
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => {
                      setPaymentPlan(null);
                      onOpenWallet();
                    }}
                    accessibilityLabel="Top up wallet"
                  >
                    <Text style={styles.subscribeButtonText}>Top up wallet</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.modalCancel} onPress={() => setPaymentPlan(null)}>
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStep === 'success' && (
              <>
                <Ionicons name="checkmark-circle" size={56} color="#7B2CBF" />
                <Text style={styles.modalTitle}>Payment successful</Text>
                <Text style={styles.modalNote}>
                  Your VIP account is unlocked with the {paymentPlan?.name} plan until{' '}
                  {formatDate(planExpiresAt)}.
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
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B2CBF',
    marginTop: -4,
    marginBottom: 10,
  },
  expiredText: {
    color: '#E11D48',
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
