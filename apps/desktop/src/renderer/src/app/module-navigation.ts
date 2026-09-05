import type { AppViewId } from './module-registry'

export const APP_MODULE_NAVIGATE_EVENT = 'mymind:module-navigate'

export interface AppModuleNavigationRequest {
  view: AppViewId
  resourceId?: string | null
  focusMode?: boolean
}

export function requestAppModuleNavigation(request: AppModuleNavigationRequest): void {
  window.dispatchEvent(
    new CustomEvent<AppModuleNavigationRequest>(APP_MODULE_NAVIGATE_EVENT, {
      detail: request
    })
  )
}
