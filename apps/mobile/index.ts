import { registerRootComponent } from 'expo'
import { Platform } from 'react-native'
import { getSafeWebPreviewRedirect } from './src/shared/platform/web-preview'

function registerNativeApp(): void {
  const App = require('./App').default as typeof import('./App').default
  registerRootComponent(App)
}

if (Platform.OS !== 'web') {
  registerNativeApp()
} else {
  const browserLocation = typeof window === 'undefined' ? undefined : window.location
  const webPreviewRedirect = getSafeWebPreviewRedirect(
    browserLocation?.href,
    process.env.EXPO_PUBLIC_MYMIND_WEB_PREVIEW_ORIGIN
  )

  if (browserLocation && webPreviewRedirect) {
    browserLocation.replace(webPreviewRedirect)
  } else {
    void import('./App').then(({ default: App }) => {
      registerRootComponent(App)
    })
  }
}
