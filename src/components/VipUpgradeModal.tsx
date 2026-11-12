import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VipUpgradeModalProps {
  // Tên tính năng bị khoá, null là đang ẩn
  feature: string | null;
  onViewPlans: () => void;
  onClose: () => void;
}

// Hộp thoại mời nâng cấp khi thành viên thường dùng tính năng dành cho VIP
export const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({ feature, onViewPlans, onClose }) => (
  <Modal visible={feature !== null} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityRole="alert">
        <View style={styles.iconCircle}>
          <Ionicons name="diamond" size={26} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Tính năng dành cho VIP</Text>
        <Text style={styles.message}>
          {feature} chỉ dành cho thành viên VIP. Hãy đăng ký Gói VIP (Premium) để mở khoá.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onViewPlans} activeOpacity={0.85}>
          <Text style={styles.primaryText}>Xem các gói</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryText}>Để sau</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7B2CBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#565A63',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7B2CBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  secondaryText: {
    color: '#565A63',
    fontSize: 14,
    fontWeight: '600',
  },
});
