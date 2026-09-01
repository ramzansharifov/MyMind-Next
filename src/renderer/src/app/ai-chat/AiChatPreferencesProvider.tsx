import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

const AI_CHAT_LAUNCHER_VISIBLE_STORAGE_KEY = 'mymind.ai-chat.launcher-visible'

interface AiChatPreferencesContextValue {
  showLauncher: boolean
  setShowLauncher: (showLauncher: boolean) => void
}

const AiChatPreferencesContext = createContext<AiChatPreferencesContextValue | null>(null)

function readShowLauncherPreference(): boolean {
  try {
    return window.localStorage.getItem(AI_CHAT_LAUNCHER_VISIBLE_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function writeShowLauncherPreference(showLauncher: boolean): void {
  try {
    window.localStorage.setItem(AI_CHAT_LAUNCHER_VISIBLE_STORAGE_KEY, String(showLauncher))
  } catch {
    // The preference remains active for the current session when storage is unavailable.
  }
}

export function AiChatPreferencesProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [showLauncher, setShowLauncherState] = useState(readShowLauncherPreference)

  const setShowLauncher = useCallback((nextShowLauncher: boolean): void => {
    setShowLauncherState(nextShowLauncher)
    writeShowLauncherPreference(nextShowLauncher)
  }, [])

  const value = useMemo<AiChatPreferencesContextValue>(
    () => ({ showLauncher, setShowLauncher }),
    [setShowLauncher, showLauncher]
  )

  return (
    <AiChatPreferencesContext.Provider value={value}>{children}</AiChatPreferencesContext.Provider>
  )
}

export function useAiChatPreferences(): AiChatPreferencesContextValue {
  const context = useContext(AiChatPreferencesContext)

  if (!context) {
    throw new Error('useAiChatPreferences must be used inside AiChatPreferencesProvider')
  }

  return context
}
