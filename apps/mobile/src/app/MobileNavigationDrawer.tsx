import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { navigationRoutes, routeIcons, routeTitles, type Route } from './navigation'
import { AppIcon } from '../shared/ui/icons'
import { useTheme } from '../shared/ui/theme'

const moduleRoutes = navigationRoutes.filter((route) => route !== 'settings')

export function MobileNavigationDrawer({
  visible,
  currentRoute,
  close,
  navigate
}: {
  visible: boolean
  currentRoute: Route
  close(): void
  navigate(route: Route): void
}): React.JSX.Element {
  const theme = useTheme()

  const renderRoute = (route: Route): React.JSX.Element => {
    const selected = route === currentRoute

    return (
      <Pressable
        key={route}
        accessibilityRole="button"
        accessibilityLabel={routeTitles[route]}
        accessibilityState={{ selected }}
        onPress={() => navigate(route)}
        style={({ pressed }) => ({
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: selected ? theme.accent + '33' : 'transparent',
          borderRadius: 14,
          backgroundColor: selected ? theme.accent + '14' : pressed ? theme.raised : 'transparent',
          opacity: pressed ? 0.78 : 1
        })}
      >
        <View
          style={{
            width: 34,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: selected ? theme.accent + '35' : theme.border,
            borderRadius: 11,
            backgroundColor: selected ? theme.accent + '12' : theme.background
          }}
        >
          <AppIcon
            name={routeIcons[route]}
            size={18}
            color={selected ? theme.accent : theme.muted}
          />
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: selected ? theme.text : theme.muted,
            fontSize: 15,
            lineHeight: 20,
            fontWeight: selected ? '700' : '600'
          }}
        >
          {routeTitles[route]}
        </Text>

        {selected ? (
          <View
            accessibilityLabel="Текущий раздел"
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: theme.accent
            }}
          />
        ) : null}
      </Pressable>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#00000073' }}>
        <SafeAreaView
          edges={['top', 'bottom', 'left']}
          style={{
            width: '84%',
            maxWidth: 360,
            backgroundColor: theme.surface,
            borderRightWidth: 1,
            borderRightColor: theme.border
          }}
        >
          <View
            style={{
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.accent + '30',
                borderRadius: 13,
                backgroundColor: theme.accent + '12'
              }}
            >
              <AppIcon name="home" size={19} color={theme.accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>MyMind</Text>
              <Text style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
                Навигация по разделам
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть меню"
              onPress={close}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: pressed ? theme.raised : 'transparent',
                opacity: pressed ? 0.75 : 1
              })}
            >
              <AppIcon name="close" size={20} color={theme.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, paddingBottom: 18, gap: 4 }}
          >
            {moduleRoutes.map(renderRoute)}

            <View
              style={{
                height: 1,
                marginHorizontal: 4,
                marginVertical: 8,
                backgroundColor: theme.border
              }}
            />

            {renderRoute('settings')}
          </ScrollView>
        </SafeAreaView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть меню навигации"
          onPress={close}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  )
}
