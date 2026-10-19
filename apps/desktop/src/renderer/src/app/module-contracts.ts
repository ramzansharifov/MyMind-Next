/** Platform-neutral navigation types; importing these must not load the module registry. */
export type AppViewId =
  | 'home'
  | 'study'
  | 'boards'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'movies'
  | 'music'
  | 'calendar'
  | 'diary'
  | 'workouts'
  | 'nutrition'
  | 'finance'
  | 'passwords'
  | 'settings'
export interface AppModuleProps {
  resourceId?: string | null
  onResourceHandled?: () => void
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => void
}
