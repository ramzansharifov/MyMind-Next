import { Platform } from 'react-native'

if (Platform.OS === 'web') {
  void import('./src/bootstrap/web')
} else {
  require('./src/bootstrap/native')
}
