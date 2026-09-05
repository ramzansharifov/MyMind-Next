import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'

import { mobileCoreContext, mobileDesignTokens } from './shared-core'

export default function App(): React.JSX.Element {
  const title = mobileCoreContext.platform === 'mobile' ? 'MyMind Mobile' : 'MyMind'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text>Базовая структура React Native / Expo</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    marginBottom: mobileDesignTokens.spacing.sm,
    fontSize: mobileDesignTokens.typography.title,
    fontWeight: '600'
  }
})
