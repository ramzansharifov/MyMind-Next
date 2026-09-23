import { createContext, useContext } from 'react'

import type { AppIconName } from './icons'

export interface MobileCreateActionOverlayItem {
  key: string
  label: string
  description?: string
  icon?: AppIconName
  color?: string
}

export interface MobileCreateActionOverlayController {
  show(items: readonly MobileCreateActionOverlayItem[], index: number): void
  update(index: number, offsetY: number): void
  hide(): void
}

export const MobileCreateActionOverlayContext =
  createContext<MobileCreateActionOverlayController | null>(null)

export function useMobileCreateActionOverlay(): MobileCreateActionOverlayController | null {
  return useContext(MobileCreateActionOverlayContext)
}
