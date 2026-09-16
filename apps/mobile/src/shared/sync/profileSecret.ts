import * as SecureStore from 'expo-secure-store'
import type { ProfileSecretPort } from '@mymind/persistence/local-profile'

const PROFILE_SYNC_KEY = 'mymind.local-profile.sync-key.v1'

export const mobileProfileSecret: ProfileSecretPort = {
  get() {
    return SecureStore.getItemAsync(PROFILE_SYNC_KEY)
  },
  set(value) {
    return SecureStore.setItemAsync(PROFILE_SYNC_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    })
  },
  remove() {
    return SecureStore.deleteItemAsync(PROFILE_SYNC_KEY)
  }
}
