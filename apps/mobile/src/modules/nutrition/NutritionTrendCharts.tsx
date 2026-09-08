import { ScrollView, Text, View } from 'react-native'
import type { NutritionReportDay } from '@mymind/contracts/nutrition'
import { useTheme } from '../../shared/ui/theme'

export function NutritionTrendCharts({ timeline }: { timeline: NutritionReportDay[] }): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      <TrendChart
        title="Калории по дням"
        unit="ккал"
        timeline={timeline}
        value={(item) => item.nutrients.calories}
        target={(item) => item.targetCalories}
      />
      <TrendChart
        title="Вода по дням"
        unit="мл"
        timeline={timeline}
        value={(item) => item.waterMl}
        target={(item) => item.targetWaterMl}
      />
    </View>
  )
}

function TrendChart({
  title,
  unit,
  timeline,
  value,
  target
}: {
  title: string
  unit: string
  timeline: NutritionReportDay[]
  value(item: NutritionReportDay): number
  target(item: NutritionReportDay): number | null
}): React.JSX.Element {
  const theme = useTheme()
  const values = timeline.map(value)
  const targetValues = timeline.map(target).filter((item): item is number => item !== null)
  const max = Math.max(1, ...values, ...targetValues)

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 10 }}>
          Столбец — фактическое значение; отметка внутри — дневная цель.
        </Text>
      </View>
      {timeline.length === 0 ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>Нет данных для графика.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'flex-end', gap: 7, minHeight: 152, paddingTop: 6 }}
        >
          {timeline.map((item) => {
            const actual = value(item)
            const goal = target(item)
            const barHeight = Math.max(4, (actual / max) * 104)
            const goalBottom = goal === null ? null : Math.max(0, Math.min(104, (goal / max) * 104))
            return (
              <View key={`${title}:${item.date}`} style={{ width: 48, alignItems: 'center', gap: 5 }}>
                <Text style={{ color: theme.text, fontSize: 9, fontWeight: '700' }}>
                  {Math.round(actual)}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 108,
                    borderRadius: 11,
                    overflow: 'hidden',
                    justifyContent: 'flex-end',
                    backgroundColor: theme.raised
                  }}
                >
                  <View
                    accessibilityLabel={`${item.date}: ${Math.round(actual)} ${unit}`}
                    style={{ width: '100%', height: barHeight, backgroundColor: theme.accent }}
                  />
                  {goalBottom !== null ? (
                    <View
                      accessibilityLabel={`Цель ${Math.round(goal ?? 0)} ${unit}`}
                      style={{
                        position: 'absolute',
                        left: 2,
                        right: 2,
                        bottom: goalBottom,
                        height: 2,
                        backgroundColor: theme.text
                      }}
                    />
                  ) : null}
                </View>
                <Text style={{ color: theme.muted, fontSize: 9 }}>{item.date.slice(5)}</Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
