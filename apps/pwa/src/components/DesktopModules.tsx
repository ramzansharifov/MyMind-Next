import { lazy, Suspense, useEffect } from 'react'
import { AppearanceContext } from '../../../desktop/src/renderer/src/app/appearance/appearance-context'
import { applyAppearanceToRoot } from '../../../desktop/src/renderer/src/app/appearance/appearance-dom'
import { TooltipProvider } from '../../../desktop/src/renderer/src/shared/ui/tooltip'
import { StudyBlockAssetProvider } from '../../../desktop/src/renderer/src/modules/study/components/StudyBlockAssetProvider'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import { desktopRuntime } from '../desktop/runtime'

const Study = lazy(() =>
  import('../../../desktop/src/renderer/src/modules/study/StudyPage').then((module) => ({
    default: module.StudyPage
  }))
)
const Boards = lazy(() =>
  import('../../../desktop/src/renderer/src/modules/boards/BoardsPage').then((module) => ({
    default: module.BoardsPage
  }))
)
const Notes = lazy(() =>
  import('../../../desktop/src/renderer/src/modules/notes/NotesPage').then((module) => ({
    default: module.NotesPage
  }))
)
const Workouts = lazy(() =>
  import('../../../desktop/src/renderer/src/modules/workouts/WorkoutsPage').then((module) => ({
    default: module.WorkoutsPage
  }))
)

export default function DesktopModules({
  route,
  appearance,
  dark,
  focus,
  setFocus,
  resourceId,
  handled
}: {
  route: 'study' | 'boards' | 'workouts' | 'notes'
  appearance: AppearancePreferences
  dark: boolean
  focus: boolean
  setFocus(value: boolean): void
  resourceId: string | null
  handled(): void
}): React.JSX.Element {
  const {
    repositories: { assets }
  } = desktopRuntime()
  useEffect(() => {
    applyAppearanceToRoot(document.documentElement, appearance, dark)
  }, [appearance, dark])
  return (
    <AppearanceContext.Provider
      value={{
        preferences: appearance,
        resolvedTheme: dark ? 'dark' : 'light',
        status: 'ready',
        error: null,
        setTheme: () => undefined,
        setAccent: () => undefined
      }}
    >
      <TooltipProvider>
        <StudyBlockAssetProvider
          client={{
            importAsset: window.api.study.importAsset,
            openAsset: window.api.study.openAsset,
            resolveAssetUri: assets.resolveAssetUri,
            saveRecordedAudio: async ({ nodeId, data, mimeType }) => {
              const uri = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: mimeType }))
              try {
                return await assets.saveRecordedAudio(nodeId, { uri, mimeType })
              } finally {
                URL.revokeObjectURL(uri)
              }
            }
          }}
        >
          <div className="desktop-module">
            <Suspense fallback={<div role="status">Открываем раздел…</div>}>
              {route === 'notes' ? (
                <Notes resourceId={resourceId} onResourceHandled={handled} />
              ) : route === 'study' ? (
                <Study
                  resourceId={resourceId}
                  onResourceHandled={handled}
                  focusMode={focus}
                  onFocusModeChange={setFocus}
                />
              ) : route === 'boards' ? (
                <Boards
                  resourceId={resourceId}
                  onResourceHandled={handled}
                  focusMode={focus}
                  onFocusModeChange={setFocus}
                />
              ) : (
                <Workouts resourceId={resourceId} onResourceHandled={handled} />
              )}
            </Suspense>
          </div>
        </StudyBlockAssetProvider>
      </TooltipProvider>
    </AppearanceContext.Provider>
  )
}
