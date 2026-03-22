import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface ConvergenceDotsProps {
  filled: number;
  total: number;
  color?: string;
  size?: number;
  gap?: number;
}

export function ConvergenceDots({
  filled,
  total,
  color = colors.emerald,
  size = 8,
  gap = 4,
}: ConvergenceDotsProps) {
  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: i < filled ? color : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {},
});
