import { Platform } from 'react-native'

if (Platform.OS === 'web') {
  void import('./src/bootstrap/web')
} else {
  // Native app registration must finish synchronously during bootstrap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./src/bootstrap/native')
}
