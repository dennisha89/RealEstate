import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
});
