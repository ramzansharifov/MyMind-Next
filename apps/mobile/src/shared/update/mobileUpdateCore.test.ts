import { describe, expect, it } from 'vitest'

import { compareVersions, findLatestMobileRelease } from './mobileUpdateCore'

describe('mobile update release selection', () => {
  it('compares semantic app versions numerically', () => {
    expect(compareVersions('1.1.4', '1.1.3')).toBeGreaterThan(0)
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
  })

  it('selects the newest public release that contains a matching mobile APK', () => {
    const release = findLatestMobileRelease(
      [
        {
          tag_name: 'v1.1.5',
          draft: false,
          prerelease: false,
          assets: [
            {
              name: 'mymind-next-1.1.5-setup.exe',
              browser_download_url: 'https://example.com/desktop.exe',
              size: 10
            }
          ]
        },
        {
          tag_name: 'v1.1.4',
          draft: false,
          prerelease: false,
          assets: [
            {
              name: 'mymind-mobile-1.1.4.apk',
              browser_download_url: 'https://example.com/mobile.apk',
              size: 123
            }
          ]
        }
      ],
      '1.1.3'
    )

    expect(release).toEqual({
      version: '1.1.4',
      tagName: 'v1.1.4',
      assetName: 'mymind-mobile-1.1.4.apk',
      downloadUrl: 'https://example.com/mobile.apk',
      size: 123
    })
  })

  it('ignores prereleases, mismatched asset versions and non-newer versions', () => {
    expect(
      findLatestMobileRelease(
        [
          {
            tag_name: 'v1.2.0',
            draft: false,
            prerelease: true,
            assets: [
              {
                name: 'mymind-mobile-1.2.0.apk',
                browser_download_url: 'https://example.com/prerelease.apk',
                size: 1
              }
            ]
          },
          {
            tag_name: 'v1.1.5',
            draft: false,
            prerelease: false,
            assets: [
              {
                name: 'mymind-mobile-1.1.4.apk',
                browser_download_url: 'https://example.com/mismatch.apk',
                size: 1
              }
            ]
          },
          {
            tag_name: 'v1.1.3',
            draft: false,
            prerelease: false,
            assets: [
              {
                name: 'mymind-mobile-1.1.3.apk',
                browser_download_url: 'https://example.com/current.apk',
                size: 1
              }
            ]
          }
        ],
        '1.1.3'
      )
    ).toBeNull()
  })
})
