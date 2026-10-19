/**
 * PWA-only type contracts for Expo imports that appear in the shared mobile
 * source graph during Next.js type-checking.
 *
 * Next/Webpack uses browser adapters for expo-crypto, expo-clipboard and
 * expo-blur. Native storage, picker, network and LAN implementations are not
 * instantiated by PWA (which has its own browser implementations).
 *
 * This file has no runtime output and must not be used for mobile type-checking:
 * the mobile app uses the official Expo package declarations.
 */
declare module 'expo-crypto' {
  export function randomUUID(): string
  export function getRandomValues<T extends Uint8Array>(array: T): T
}

declare module 'expo-clipboard' {
  export function getStringAsync(): Promise<string>
  export function setStringAsync(value: string): Promise<boolean>
}

declare module 'expo-document-picker' {
  export interface DocumentPickerAsset {
    uri: string
    name: string
    mimeType?: string | null
  }

  export type DocumentPickerResult =
    { canceled: true; assets: null } | { canceled: false; assets: DocumentPickerAsset[] }

  export function getDocumentAsync(options: {
    type?: string | string[]
    copyToCacheDirectory?: boolean
    multiple?: boolean
  }): Promise<DocumentPickerResult>
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>
  export function shareAsync(
    url: string,
    options?: { dialogTitle?: string; mimeType?: string }
  ): Promise<void>
}

declare module 'expo-network' {
  export function getIpAddressAsync(): Promise<string>
}

declare module 'expo-secure-store' {
  export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: string
  export function getItemAsync(key: string): Promise<string | null>
  export function setItemAsync(
    key: string,
    value: string,
    options?: { keychainAccessible?: string }
  ): Promise<void>
  export function deleteItemAsync(key: string): Promise<void>
}

declare module 'expo-blur' {
  import type { ComponentType, RefAttributes, RefObject } from 'react'
  import type { View, ViewProps } from 'react-native'

  export const BlurTargetView: ComponentType<ViewProps & RefAttributes<View>>
  export const BlurView: ComponentType<
    ViewProps & {
      blurTarget?: RefObject<View | null>
      blurMethod?: string
      intensity?: number
      tint?: 'default' | 'light' | 'dark'
    }
  >
}
