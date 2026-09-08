import { useMemo, useState } from 'react'
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native'
import type {
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoView
} from '@mymind/contracts/workouts'
import { Button, EmptyState, Row } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  workoutPhotoComparison,
  workoutProgressSummary,
  type DatedWorkoutPhoto
} from './workout-progress-presentation'

const PHOTO_VIEWS: Array<{
  value: Exclude<WorkoutProgressPhotoView, 'custom'>
  label: string
}> = [
  { value: 'front', label: 'Спереди' },
  { value: 'left', label: 'Слева' },
  { value: 'right', label: 'Справа' },
  { value: 'back', label: 'Сзади' }
]

function formatWeight(value: number | null): string {
  if (value === null) return '—'
  return `${Number(value.toFixed(2))} кг`
}

function formatDelta(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return '0 кг'
  return `${value > 0 ? '+' : '−'}${Number(Math.abs(value).toFixed(2))} кг`
}

export function WorkoutProgressView({
  entries,
  refreshing,
  refresh,
  onAdd,
  onEdit,
  onDelete
}: {
  entries: WorkoutProgressEntryRecord[]
  refreshing: boolean
  refresh(): void
  onAdd(): void
  onEdit(entry: WorkoutProgressEntryRecord): void
  onDelete(entry: WorkoutProgressEntryRecord): void
}): React.JSX.Element {
  const theme = useTheme()
  const [comparisonView, setComparisonView] =
    useState<Exclude<WorkoutProgressPhotoView, 'custom'>>('front')
  const summary = useMemo(() => workoutProgressSummary(entries), [entries])
  const comparison = useMemo(
    () => workoutPhotoComparison(entries, comparisonView),
    [comparisonView, entries]
  )
  const latestFirst = useMemo(
    () => [...entries].sort((left, right) => right.date.localeCompare(left.date)),
    [entries]
  )

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      contentContainerStyle={{ gap: 14, paddingBottom: 48 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Прогресс</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Вес, контрольные точки и сравнение фотографий
          </Text>
        </View>
        <Button label="+ Запись" selected onPress={onAdd} />
      </View>

      {entries.length === 0 ? (
        <EmptyState text="Создайте первую контрольную точку прогресса." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Metric label="Текущий вес" value={formatWeight(summary.latestWeightKg)} />
            <Metric label="Изменение" value={formatDelta(summary.weightDeltaKg)} />
            <Metric label="Точки" value={String(summary.entries)} />
            <Metric label="Фото" value={String(summary.photos)} />
          </View>

          <Section title="Динамика веса" subtitle="Все контрольные точки с указанным весом тела">
            {summary.weightPoints.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                Укажите вес хотя бы в одной записи, чтобы увидеть динамику.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  alignItems: 'flex-end',
                  gap: 8,
                  minHeight: 142,
                  paddingTop: 8
                }}
              >
                {summary.weightPoints.map((point) => {
                  const barHeight = 28 + point.normalized * 78
                  return (
                    <View key={point.id} style={{ width: 52, alignItems: 'center', gap: 5 }}>
                      <Text style={{ color: theme.text, fontSize: 10, fontWeight: '700' }}>
                        {Number(point.weightKg.toFixed(2))}
                      </Text>
                      <View
                        accessibilityLabel={`${point.date}: ${point.weightKg} кг`}
                        style={{
                          width: 18,
                          height: barHeight,
                          minHeight: 28,
                          borderRadius: 9,
                          backgroundColor: theme.accent
                        }}
                      />
                      <Text style={{ color: theme.muted, fontSize: 9 }}>{point.date.slice(5)}</Text>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </Section>

          <Section
            title="Визуальный прогресс"
            subtitle="Самый ранний и последний снимок одного ракурса"
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {PHOTO_VIEWS.map((option) => (
                <Button
                  key={option.value}
                  label={option.label}
                  selected={comparisonView === option.value}
                  onPress={() => setComparisonView(option.value)}
                />
              ))}
            </ScrollView>
            {comparison.first ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PhotoCard
                  item={comparison.first}
                  label={comparison.comparable ? 'Было' : 'Снимок'}
                />
                {comparison.comparable && comparison.last ? (
                  <PhotoCard item={comparison.last} label="Стало" />
                ) : null}
              </View>
            ) : (
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                Для этого ракурса фотографий пока нет.
              </Text>
            )}
            {comparison.first && !comparison.comparable ? (
              <Text style={{ color: theme.muted, fontSize: 11 }}>
                Добавьте второй снимок этого ракурса в другой контрольной точке для сравнения.
              </Text>
            ) : null}
          </Section>

          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
              Контрольные точки
            </Text>
            {latestFirst.map((entry) => (
              <Row
                key={entry.id}
                title={`${entry.date}${entry.bodyWeightKg === null ? '' : ` · ${formatWeight(entry.bodyWeightKg)}`}`}
                subtitle={[
                  entry.wellbeing,
                  entry.notes,
                  `${entry.metrics.length} показателей`,
                  `${entry.photos.length} фото`
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => onEdit(entry)}
                onLongPress={() => onDelete(entry)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minWidth: 140,
        flexGrow: 1,
        flexBasis: '46%',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 4
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 12
      }}
    >
      <View style={{ gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>{subtitle}</Text>
      </View>
      {children}
    </View>
  )
}

function PhotoCard({ item, label }: { item: DatedWorkoutPhoto; label: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.raised
      }}
    >
      <Image
        accessibilityLabel={`${label}: фотография прогресса ${item.date}`}
        source={{ uri: item.photo.url }}
        resizeMode="cover"
        style={{ width: '100%', aspectRatio: 0.8 }}
      />
      <View style={{ padding: 9, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: theme.muted, fontSize: 10 }}>{item.date}</Text>
      </View>
    </View>
  )
}
