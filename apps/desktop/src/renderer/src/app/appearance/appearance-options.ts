import type { AppAccentColor, AppThemePreference } from '../../../../shared/contracts/preferences'

interface ThemeOption {
  value: AppThemePreference
  label: string
  description: string
}

interface AccentOption {
  value: AppAccentColor
  label: string
  preview: string
}

export const APP_THEME_OPTIONS = [
  {
    value: 'system',
    label: 'Как в системе',
    description: 'Автоматически использовать светлую или тёмную тему системы.'
  },
  {
    value: 'light',
    label: 'Светлая',
    description: 'Светлые поверхности и тёмный текст.'
  },
  {
    value: 'dark',
    label: 'Тёмная',
    description: 'Тёмные поверхности и светлый текст.'
  }
] as const satisfies readonly ThemeOption[]

export const APP_ACCENT_OPTIONS = [
  {
    value: 'violet',
    label: 'Фиолетовый',
    preview: '#8b5cf6'
  },
  {
    value: 'blue',
    label: 'Синий',
    preview: '#3b82f6'
  },
  {
    value: 'emerald',
    label: 'Изумрудный',
    preview: '#10b981'
  },
  {
    value: 'amber',
    label: 'Янтарный',
    preview: '#f59e0b'
  },
  {
    value: 'rose',
    label: 'Розовый',
    preview: '#f43f5e'
  }
] as const satisfies readonly AccentOption[]
