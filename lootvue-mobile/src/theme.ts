export const colors = {
  bg: '#000000',
  card: '#0D0D0D',
  cardElevated: '#1A1A1A',
  border: '#1F1F1F',
  gold: '#C9A227',
  goldLight: '#E8C547',
  goldMuted: '#C9A22720',
  emerald: '#10B981',
  emeraldMuted: '#10B98120',
  amber: '#F59E0B',
  amberMuted: '#F59E0B20',
  rose: '#EF4444',
  roseMuted: '#EF444420',
  textPrimary: '#FAFAFA',
  textSecondary: '#999999',
  textDisabled: '#666666',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export const fonts = {
  mono: 'monospace' as const,
  display: 'System' as const,
  body: 'System' as const,
};

export type Colors = typeof colors;
export type Spacing = typeof spacing;
