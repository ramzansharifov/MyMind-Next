import { type PropsWithChildren, useCallback, useMemo, useState } from 'react'

import {
  AiChatPreferencesContext,
  type AiChatPreferencesContextValue
} from './ai-chat-preferences-context'

const AI_CHAT_LAUNCHER_VISIBLE_STORAGE_KEY = 'mymind.ai-chat.launcher-visible'

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
