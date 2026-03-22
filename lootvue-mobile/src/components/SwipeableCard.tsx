import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { colors, radius, spacing, fontSize } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;
const SWIPE_OUT_DURATION = 250;

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'SAVE',
  leftLabel = 'PASS',
  style,
  disabled = false,
}: SwipeableCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const hapticFired = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 5,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: 0 });

        // Fire haptic once when threshold crossed
        if (!hapticFired.current && Math.abs(gestureState.dx) >= SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          hapticFired.current = true;
        }
        if (Math.abs(gestureState.dx) < SWIPE_THRESHOLD) {
          hapticFired.current = false;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const swipeRight = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipeRight?.();
    });
  };

  const swipeLeft = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipeLeft?.();
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      bounciness: 4,
      speed: 20,
    }).start();
  };

  // Derive rotation and reveal opacity from position
  const cardRotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-4deg', '0deg', '4deg'],
    extrapolate: 'clamp',
  });

  const rightRevealOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftRevealOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrapper, style]}>
      {/* Right reveal — SAVE (green) */}
      <Animated.View style={[styles.reveal, styles.revealRight, { opacity: rightRevealOpacity }]}>
        <Check size={20} color="#fff" aria-hidden />
        <Text style={styles.revealText}>{rightLabel}</Text>
      </Animated.View>

      {/* Left reveal — PASS (red) */}
      <Animated.View style={[styles.reveal, styles.revealLeft, { opacity: leftRevealOpacity }]}>
        <X size={20} color="#fff" aria-hidden />
        <Text style={styles.revealText}>{leftLabel}</Text>
      </Animated.View>

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { rotate: cardRotation },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}

        {/* Swipe hint arrows — very subtle */}
        {!disabled && (
          <View style={styles.hintRow} pointerEvents="none">
            <Text style={styles.hintLeft}>← PASS</Text>
            <Text style={styles.hintRight}>SAVE →</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  reveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    zIndex: 0,
  },
  revealRight: {
    right: 0,
    backgroundColor: colors.emerald,
  },
  revealLeft: {
    left: 0,
    backgroundColor: colors.rose,
  },
  revealText: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  card: {
    zIndex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  hintLeft: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    letterSpacing: 0.5,
  },
  hintRight: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    letterSpacing: 0.5,
  },
});
