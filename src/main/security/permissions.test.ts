import { describe, expect, it } from 'vitest'

import { isAppPermissionAllowed } from './permissions'

describe('isAppPermissionAllowed', () => {
  it.each([
    'camera',
    'microphone',
    'geolocation',
    'notifications',
    'midi',
    'midiSysex',
    'pointerLock',
    'fullscreen',
    'clipboard-read'
  ])('denies %s by default', (permission) => {
    expect(isAppPermissionAllowed(permission)).toBe(false)
  })
})
