import { describe, expect, it, vi } from 'vitest'

import { installPermissionPolicy, isAppPermissionAllowed } from './permissions'

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

  it('installs both Electron permission handlers', () => {
    const setPermissionCheckHandler = vi.fn()
    const setPermissionRequestHandler = vi.fn()

    installPermissionPolicy({ setPermissionCheckHandler, setPermissionRequestHandler })

    expect(setPermissionCheckHandler).toHaveBeenCalledOnce()
    expect(setPermissionRequestHandler).toHaveBeenCalledOnce()
  })
})
