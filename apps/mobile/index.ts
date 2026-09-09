import { registerRootComponent } from 'expo'
import { getSafeWebPreviewRedirect } from './src/shared/platform/web-preview'

const browserLocation = typeof window === 'undefined' ? undefined : window.location
const webPreviewRedirect = getSafeWebPreviewRedirect(
  browserLocation?.href,
  process.env.EXPO_PUBLIC_MYMIND_WEB_PREVIEW_ORIGIN
)

if (browserLocation && webPreviewRedirect) {
  browserLocation.replace(webPreviewRedirect)
} else {
  void import('./App').then(({ default: App }) => {
    // registerRootComponent calls AppRegistry.registerComponent('main', () => App);
    // It also ensures that whether you load the app in Expo Go or in a native build,
    // the environment is set up appropriately.
    registerRootComponent(App)
  })
}
