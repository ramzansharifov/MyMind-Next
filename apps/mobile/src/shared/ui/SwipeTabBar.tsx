import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, Text, TextInput, View } from 'react-native'
import { Search, X } from 'lucide-react-native'

import { useTheme } from './theme'
import type { SwipeTabFeedback } from './useSwipeTabFeedback'

export interface SwipeTabBarItem<T extends string = string> {
  id: T
  label: string
  disabled?: boolean
}

export interface InlineTabSearchConfig {
  value: string
  onChangeText(value: string): void
  placeholder?: string
  accessibilityLabel?: string
}

function InlineSearchField({
  search,
  close
}: {
  search: InlineTabSearchConfig
  close(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 10,
        paddingRight: 4,
        borderRadius: 12,
        backgroundColor: theme.raised
      }}
    >
      <Search size={17} color={theme.muted} />
      <TextInput
        autoFocus
        accessibilityLabel={search.accessibilityLabel ?? 'Поиск'}
        placeholder={search.placeholder ?? 'Поиск…'}
        placeholderTextColor={theme.muted}
        value={search.value}
        onChangeText={search.onChangeText}
        clearButtonMode="never"
        returnKeyType="search"
        style={{
          flex: 1,
          minWidth: 0,
          height: 40,
          paddingVertical: 0,
          color: theme.text,
          fontSize: 14
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Закрыть поиск"
        onPress={close}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: pressed ? theme.surface : 'transparent',
          opacity: pressed ? 0.72 : 1
        })}
      >
        <X size={17} color={theme.muted} />
      </Pressable>
    </View>
  )
}

export function SearchableHeaderRow({
  children,
  search,
  minHeight = 54,
  borderRadius = 15,
  paddingHorizontal = 7,
  paddingVertical = 6,
  gap = 9
}: {
  children: ReactNode
  search: InlineTabSearchConfig
  minHeight?: number
  borderRadius?: number
  paddingHorizontal?: number
  paddingVertical?: number
  gap?: number
}): React.JSX.Element {
  const theme = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchProgress] = useState(() => new Animated.Value(0))

  useEffect(
    () => () => {
      searchProgress.stopAnimation()
    },
    [searchProgress]
  )

  const openSearch = (): void => {
    searchProgress.stopAnimation()
    searchProgress.setValue(0)
    setSearchOpen(true)
    onSearchOpenChange?.(true)
    requestAnimationFrame(() => {
      Animated.timing(searchProgress, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start()
    })
  }

  const closeSearch = (): void => {
    search.onChangeText('')
    Animated.timing(searchProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setSearchOpen(false)
        onSearchOpenChange?.(false)
      }
    })
  }

  const normalOpacity = searchProgress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 0.12, 0],
    extrapolate: 'clamp'
  })
  const normalTranslateX = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -54],
    extrapolate: 'clamp'
  })
  const searchOpacity = searchProgress.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [0, 0.82, 1],
    extrapolate: 'clamp'
  })
  const searchTranslateX = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [62, 0],
    extrapolate: 'clamp'
  })

  return (
    <View
      style={{
        position: 'relative',
        minHeight,
        overflow: 'hidden',
        paddingHorizontal,
        paddingVertical,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius,
        backgroundColor: theme.surface
      }}
    >
      <Animated.View
        pointerEvents={searchOpen ? 'none' : 'auto'}
        style={{
          minHeight: minHeight - paddingVertical * 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap,
          opacity: normalOpacity,
          transform: [{ translateX: normalTranslateX }]
        }}
      >
        {children}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Поиск"
          accessibilityState={{ selected: Boolean(search.value) }}
          onPress={openSearch}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: search.value
              ? theme.accent + '18'
              : pressed
                ? theme.raised
                : 'transparent',
            opacity: pressed ? 0.72 : 1
          })}
        >
          <Search size={18} color={search.value ? theme.accent : theme.muted} />
        </Pressable>
      </Animated.View>

      {searchOpen ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: paddingVertical,
            right: paddingHorizontal,
            bottom: paddingVertical,
            left: paddingHorizontal,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: searchOpacity,
            transform: [{ translateX: searchTranslateX }]
          }}
        >
          <InlineSearchField search={search} close={closeSearch} />
        </Animated.View>
      ) : null}
    </View>
  )
}

export function SwipeTabBar<T extends string, I extends SwipeTabBarItem<T>>({
  items,
  value,
  onChange,
  feedback,
  renderIcon,
  trailing,
  search,
  onSearchOpenChange
}: {
  items: readonly I[]
  value: T
  onChange(value: T): void
  feedback?: SwipeTabFeedback<T> | null
  renderIcon(item: I, selected: boolean): ReactNode
  trailing?: ReactNode
  search?: InlineTabSearchConfig
  onSearchOpenChange?(open: boolean): void
}): React.JSX.Element {
  const theme = useTheme()
  const [progress] = useState(() => new Animated.Value(0))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchProgress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (!feedback) return

    progress.stopAnimation()
    progress.setValue(0)

    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.delay(620),
      Animated.timing(progress, {
        toValue: 2,
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      })
    ]).start()

    return () => {
      progress.stopAnimation()
    }
  }, [feedback, progress])

  useEffect(
    () => () => {
      progress.stopAnimation()
      searchProgress.stopAnimation()
    },
    [progress, searchProgress]
  )

  const shownItem = useMemo(
    () => (feedback ? (items.find((item) => item.id === feedback.value) ?? null) : null),
    [feedback, items]
  )

  const openSearch = (): void => {
    if (!search || shownItem) return
    searchProgress.stopAnimation()
    searchProgress.setValue(0)
    setSearchOpen(true)
    requestAnimationFrame(() => {
      Animated.timing(searchProgress, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start()
    })
  }

  const closeSearch = (): void => {
    if (!search) return
    search.onChangeText('')
    Animated.timing(searchProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setSearchOpen(false)
    })
  }

  const directionSign = feedback?.direction === 'previous' ? 1 : -1
  const normalExit = 52 * directionSign
  const normalEnter = -52 * directionSign
  const feedbackEnter = -56 * directionSign
  const feedbackExit = 56 * directionSign

  const normalOpacity = progress.interpolate({
    inputRange: [0, 0.42, 0.58, 1.42, 1.58, 2],
    outputRange: [1, 0, 0, 0, 0, 1],
    extrapolate: 'clamp'
  })
  const normalTranslateX = progress.interpolate({
    inputRange: [0, 0.48, 0.52, 1.48, 1.52, 2],
    outputRange: [0, normalExit, normalEnter, normalEnter, normalEnter, 0],
    extrapolate: 'clamp'
  })
  const feedbackOpacity = progress.interpolate({
    inputRange: [0, 0.38, 1.5, 2],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp'
  })
  const feedbackTranslateX = progress.interpolate({
    inputRange: [0, 0.5, 1.5, 2],
    outputRange: [feedbackEnter, 0, 0, feedbackExit],
    extrapolate: 'clamp'
  })
  const feedbackScale = progress.interpolate({
    inputRange: [0, 0.5, 1.5, 2],
    outputRange: [0.985, 1, 1, 0.985],
    extrapolate: 'clamp'
  })

  const searchNormalOpacity = searchProgress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 0.12, 0],
    extrapolate: 'clamp'
  })
  const searchNormalTranslateX = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -54],
    extrapolate: 'clamp'
  })
  const searchOpacity = searchProgress.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [0, 0.82, 1],
    extrapolate: 'clamp'
  })
  const searchTranslateX = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [62, 0],
    extrapolate: 'clamp'
  })

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'relative',
        minHeight: 50,
        overflow: 'hidden',
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <Animated.View
        pointerEvents={shownItem || searchOpen ? 'none' : 'auto'}
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          opacity: Animated.multiply(normalOpacity, searchNormalOpacity),
          transform: [
            { translateX: Animated.add(normalTranslateX, searchNormalTranslateX) }
          ]
        }}
      >
        {items.map((item) => {
          const selected = item.id === value
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => onChange(item.id)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: selected
                  ? theme.accent + '18'
                  : pressed
                    ? theme.raised
                    : 'transparent',
                opacity: item.disabled ? 0.38 : pressed ? 0.72 : 1
              })}
            >
              {renderIcon(item, selected)}
            </Pressable>
          )
        })}
        {trailing}
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Поиск"
            accessibilityState={{ selected: Boolean(search.value) }}
            onPress={openSearch}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: search.value
                ? theme.accent + '18'
                : pressed
                  ? theme.raised
                  : 'transparent',
              opacity: pressed ? 0.72 : 1
            })}
          >
            <Search size={19} color={search.value ? theme.accent : theme.muted} />
          </Pressable>
        ) : null}
      </Animated.View>

      {shownItem && !searchOpen ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            opacity: feedbackOpacity,
            transform: [{ translateX: feedbackTranslateX }, { scale: feedbackScale }]
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '18'
            }}
          >
            {renderIcon(shownItem, true)}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.text,
                fontSize: 13.5,
                lineHeight: 19,
                fontWeight: '700'
              }}
            >
              {shownItem.label}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {search && searchOpen ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: searchOpacity,
            transform: [{ translateX: searchTranslateX }]
          }}
        >
          <InlineSearchField search={search} close={closeSearch} />
        </Animated.View>
      ) : null}
    </View>
  )
}
