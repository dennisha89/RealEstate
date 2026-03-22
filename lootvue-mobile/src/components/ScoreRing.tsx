import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontSize } from '../theme';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.emerald;
  if (score >= 55) return colors.amber;
  return colors.rose;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(score);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: score / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityLabel={`Score ${score} out of 100`}
    >
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardElevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color, fontSize: size < 70 ? fontSize.sm : fontSize.lg }]}>
          {score}
        </Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 1,
  },
});
