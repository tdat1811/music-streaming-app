import React, { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from 'react-native';

const BAR_HEIGHTS = [
  12, 18, 28, 22, 34, 48, 54, 42, 30, 24, 38, 44,
  32, 26, 40, 50, 46, 32, 20, 28, 36, 42, 38, 28,
  22, 32, 40, 36, 26, 18, 24, 30, 22, 16, 12, 8,
];
const PULSE_DURATION_MS = 900;

const clampRatio = (ratio: number) => Math.min(1, Math.max(0, ratio));

interface AudioWaveformProps {
  progress: number; // 0..1
  isPlaying: boolean;
  onScrub: (ratio: number | null) => void; // null khi kết thúc thao tác
  onSeek: (ratio: number) => void;
  // false: không cho tua (ví dụ tài khoản không phải VIP), chạm vào sẽ gọi onSeekBlocked
  canSeek?: boolean;
  onSeekBlocked?: () => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  progress,
  isPlaying,
  onScrub,
  onSeek,
  canSeek = true,
  onSeekBlocked,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(1);
  const gestureStartX = useRef(0);
  const scrubRatio = useRef(0);
  // Thao tác hiện tại bị chặn: bỏ qua mọi bước kéo và thả của lần chạm này
  const blocked = useRef(false);

  // PanResponder chỉ tạo một lần nên cần ref để gọi callback mới nhất
  const callbacks = useRef({ onScrub, onSeek, canSeek, onSeekBlocked });
  callbacks.current = { onScrub, onSeek, canSeek, onSeekBlocked };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        if (!callbacks.current.canSeek) {
          blocked.current = true;
          callbacks.current.onSeekBlocked?.();
          return;
        }
        blocked.current = false;
        gestureStartX.current = event.nativeEvent.locationX;
        scrubRatio.current = clampRatio(gestureStartX.current / widthRef.current);
        callbacks.current.onScrub(scrubRatio.current);
      },
      onPanResponderMove: (_, gesture) => {
        if (blocked.current) return;
        scrubRatio.current = clampRatio((gestureStartX.current + gesture.dx) / widthRef.current);
        callbacks.current.onScrub(scrubRatio.current);
      },
      onPanResponderRelease: () => {
        if (blocked.current) {
          blocked.current = false;
          return;
        }
        callbacks.current.onSeek(scrubRatio.current);
        callbacks.current.onScrub(null);
      },
      onPanResponderTerminate: () => {
        blocked.current = false;
        callbacks.current.onScrub(null);
      },
    })
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: PULSE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [isPlaying, pulse]);

  const playedBarIndex = Math.floor(progress * BAR_HEIGHTS.length);

  return (
    <View
      style={styles.container}
      accessibilityLabel="Seek bar"
      onLayout={(event) => {
        widthRef.current = event.nativeEvent.layout.width || 1;
      }}
      {...panResponder.panHandlers}
    >
      {/* Các cột không nhận chạm để toạ độ luôn tính theo cả thanh sóng */}
      <View style={styles.bars} pointerEvents="none">
        {BAR_HEIGHTS.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: index <= playedBarIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                transform: [
                  {
                    // Mỗi cột đạt đỉnh ở thời điểm và độ cao khác nhau, đều về 1 khi dừng
                    scaleY: pulse.interpolate({
                      inputRange: [0, 0.2 + ((index * 7) % 7) * 0.1, 1],
                      outputRange: [1, 1.15 + ((index * 5) % 6) * 0.08, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    marginBottom: 8,
    justifyContent: 'center',
    // Trên web, kéo chuột bôi đen chữ sẽ làm huỷ thao tác tua
    userSelect: 'none',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
});
