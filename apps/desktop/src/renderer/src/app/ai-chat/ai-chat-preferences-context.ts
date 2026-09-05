import { createContext, useContext } from 'react'

export interface AiChatPreferencesContextValue {
  showLauncher: boolean
  setShowLauncher: (showLauncher: boolean) => void
}

export const AiChatPreferencesContext = createContext<AiChatPreferencesContextValue | null>(null)

export function useAiChatPreferences(): AiChatPreferencesContextValue {
  const context = useContext(AiChatPreferencesContext)

  if (!context) {
    throw new Error('useAiChatPreferences must be used inside AiChatPreferencesProvider')
  }

  return context
}
