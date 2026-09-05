export type MaybePromise<T> = T | Promise<T>

export type AppPlatform = 'desktop' | 'mobile'

export interface ClockPort {
  now(): Date
}

export interface IdGeneratorPort {
  createId(): string
}

export interface ClipboardPort {
  writeText(value: string): MaybePromise<void>
  readText?(): MaybePromise<string>
  clear?(): MaybePromise<void>
}

export interface KeyValueStoragePort {
  get(key: string): MaybePromise<string | null>
  set(key: string, value: string): MaybePromise<void>
  remove(key: string): MaybePromise<void>
}

export interface NotificationPort {
  requestPermission?(): MaybePromise<boolean>
  show(input: {
    title: string
    body?: string
  }): MaybePromise<void>
}

export interface PlatformServices {
  clock?: ClockPort
  ids?: IdGeneratorPort
  clipboard?: ClipboardPort
  keyValueStorage?: KeyValueStoragePort
  notifications?: NotificationPort
}
