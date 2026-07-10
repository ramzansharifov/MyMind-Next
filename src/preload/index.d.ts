import type { MyMindApi } from '../shared/contracts/system'

declare global {
  interface Window {
    api: MyMindApi
  }
}

export {}
