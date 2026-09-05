import { FlatList, View } from 'react-native'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import { Button, Label } from '../shared/ui/primitives'
import { ReminderSettings } from './ReminderSettings'

export function Settings({
  appearance,
  save
}: {
  appearance: AppearancePreferences
  save(value: AppearancePreferences): void
}): React.JSX.Element {
  const names = {
    violet: 'Фиолетовый',
    blue: 'Синий',
    emerald: 'Изумрудный',
    amber: 'Янтарный',
    rose: 'Розовый'
  }
  return (
    <FlatList
      ListFooterComponent={<ReminderSettings />}
      data={[{ id: 'theme' }, { id: 'accent' }]}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ gap: 12, marginBottom: 28 }}>
          <Label title>{item.id === 'theme' ? 'Оформление' : 'Акцентный цвет'}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {item.id === 'theme'
              ? (['system', 'light', 'dark'] as const).map((theme) => (
                  <Button
                    key={theme}
                    label={{ system: 'Системное', light: 'Светлое', dark: 'Тёмное' }[theme]}
                    selected={appearance.theme === theme}
                    onPress={() => save({ ...appearance, theme })}
                  />
                ))
              : (Object.keys(names) as (keyof typeof names)[]).map((accent) => (
                  <Button
                    key={accent}
                    label={names[accent]}
                    selected={appearance.accent === accent}
                    onPress={() => save({ ...appearance, accent })}
                  />
                ))}
          </View>
        </View>
      )}
    />
  )
}
