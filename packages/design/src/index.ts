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

/** Matches desktop main.css and the final light-theme.css overrides. */
export const appearanceTokens = {
  dark: {
    background: '#0a0b0d',
    surface: '#121419',
    raised: '#181a20',
    border: '#252830',
    text: '#f2f3f5',
    muted: '#9297a3',
    error: '#fb7185',
    success: '#34d399'
  },
  light: {
    background: '#eef2f6',
    surface: '#ffffff',
    raised: '#f8fafc',
    border: '#dbe3ec',
    text: '#172131',
    muted: '#657286',
    error: '#be123c',
    success: '#047857'
  },
  accents: {
    violet: '#8b5cf6',
    blue: '#3b82f6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e'
  }
} as const
