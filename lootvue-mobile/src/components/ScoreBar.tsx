import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, fontSize, spacing, radius } from '../theme';

interface ScoreBarProps {
  score: number;
  showLabel?: boolean;
  height?: number;
  style?: ViewStyle;
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.emerald;
  if (score >= 55) return colors.amber;
  return colors.rose;
}

export function ScoreBar({ score, showLabel = true, height = 6, style }: ScoreBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const color = scoreColor(score);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: score,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, style]}>
      {showLabel ? (
        <View style={styles.header}>
          <Text style={styles.scoreText} accessibilityLabel={`Score ${score} out of 100`}>
            {score}
          </Text>
          <Text style={styles.outOf}>/100</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[styles.fill, { width: widthInterpolated, height, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  outOf: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  track: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.sm,
  },
});
