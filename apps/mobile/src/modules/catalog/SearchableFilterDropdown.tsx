import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Check, ChevronDown, Search, X } from 'lucide-react-native'

import { AppTextField } from '../../shared/ui/FormControls'
import { Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'

export function SearchableFilterDropdown({
  label,
  value,
  options,
  placeholder,
  onChange
}: {
  label: string
  value: string
  options: readonly string[]
  placeholder: string
  onChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('ru')
  const visibleOptions = useMemo(
    () =>
      normalizedSearch
        ? options.filter((option) => option.toLocaleLowerCase('ru').includes(normalizedSearch))
        : options,
    [normalizedSearch, options]
  )

  const close = (): void => {
    setOpen(false)
    setSearch('')
  }

  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, selected: Boolean(value) }}
        onPress={() => {
          if (open) close()
          else setOpen(true)
        }}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 13,
          borderWidth: 1,
          borderColor: open || value ? theme.accent + '6A' : theme.border,
          borderRadius: 14,
          backgroundColor: value ? theme.accent + '0D' : pressed ? theme.raised : theme.surface,
          opacity: pressed ? 0.76 : 1
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value ? theme.text : theme.muted,
            fontSize: 14
          }}
        >
          {value || placeholder}
        </Text>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Сбросить фильтр «${label}»`}
            hitSlop={7}
            onPress={(event) => {
              event.stopPropagation()
              onChange('')
              close()
            }}
            style={({ pressed }) => ({
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              backgroundColor: pressed ? theme.raised : 'transparent'
            })}
          >
            <X size={15} color={theme.muted} />
          </Pressable>
        ) : (
          <ChevronDown
            size={17}
            color={theme.muted}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        )}
      </Pressable>

      {open ? (
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <View
            style={{
              minHeight: 46,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Search size={16} color={theme.muted} />
            <AppTextField
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={`Поиск: ${label.toLocaleLowerCase('ru')}`}
              style={{
                flex: 1,
                minHeight: 42,
                paddingHorizontal: 0,
                paddingVertical: 8,
                borderWidth: 0,
                borderRadius: 0,
                backgroundColor: 'transparent',
                fontSize: 14
              }}
            />
          </View>

          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 210 }}
            contentContainerStyle={{ padding: 6, gap: 3 }}
          >
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const active = option === value
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(option)
                      close()
                    }}
                    style={({ pressed }) => ({
                      minHeight: 42,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: active
                        ? theme.accent + '12'
                        : pressed
                          ? theme.raised
                          : 'transparent'
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: active ? theme.accent : theme.text,
                        fontSize: 13.5,
                        fontWeight: active ? '700' : '500'
                      }}
                    >
                      {option}
                    </Text>
                    {active ? <Check size={15} color={theme.accent} /> : null}
                  </Pressable>
                )
              })
            ) : (
              <Text
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 14,
                  color: theme.muted,
                  fontSize: 12.5,
                  textAlign: 'center'
                }}
              >
                Ничего не найдено
              </Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}
