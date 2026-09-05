export const designTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999
  },
  motion: {
    fast: 120,
    normal: 180,
    slow: 260
  },
  typography: {
    body: 16,
    label: 14,
    title: 24
  }
} as const

export type DesignTokens = typeof designTokens
