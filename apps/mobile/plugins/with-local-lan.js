const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins')

const DESCRIPTION =
  'MyMind использует локальную сеть только для прямой синхронизации ваших данных с MyMind на компьютере.'

function withLocalLan(config) {
  config = withAndroidManifest(config, (next) => {
    const application = next.modResults.manifest.application?.[0]
    if (!application) throw new Error('Android application manifest entry is missing')
    application.$ ??= {}
    application.$['android:usesCleartextTraffic'] = 'true'
    return next
  })

  config = withInfoPlist(config, (next) => {
    next.modResults.NSLocalNetworkUsageDescription = DESCRIPTION
    const ats =
      typeof next.modResults.NSAppTransportSecurity === 'object' &&
      next.modResults.NSAppTransportSecurity !== null
        ? next.modResults.NSAppTransportSecurity
        : {}
    next.modResults.NSAppTransportSecurity = {
      ...ats,
      NSAllowsLocalNetworking: true
    }
    return next
  })

  return config
}

module.exports = withLocalLan
