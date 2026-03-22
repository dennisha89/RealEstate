import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  gold?: boolean;
  elevated?: boolean;
  padded?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  onPress,
  gold = false,
  elevated = false,
  padded = true,
  accessibilityLabel,
}: CardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const cardStyle = [
    styles.card,
    elevated && styles.elevated,
    gold && styles.gold,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View style={[cardStyle, { transform: [{ scale: scaleAnim }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
  },
  gold: {
    borderColor: colors.gold + '40',
    borderWidth: 1.5,
  },
  padded: {
    padding: spacing.lg,
  },
});
