import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAppRefresh } from '../context/RefreshContext';

interface RefreshButtonProps {
  // Mặc định chỉ hiện trên web (điện thoại đã có kéo xuống để làm mới)
  alwaysVisible?: boolean;
}

// Nút làm mới ứng dụng, xoay trong lúc đang tải lại
export const RefreshButton: React.FC<RefreshButtonProps> = ({ alwaysVisible = false }) => {
  const { refreshing, refreshApp } = useAppRefresh();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!refreshing) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [refreshing, spin]);

  if (!alwaysVisible && Platform.OS !== 'web') return null;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={refreshApp}
      disabled={refreshing}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Refresh"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
});
