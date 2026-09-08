import { Text, View } from 'react-native'
import type { WorkoutReportMuscleGroup, WorkoutMuscleGroup } from '@mymind/contracts/workouts'
import { useTheme } from '../../shared/ui/theme'

const LABELS: Partial<Record<WorkoutMuscleGroup, string>> = {
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  lats: 'Широчайшие',
  traps: 'Трапеции',
  lower_back: 'Поясница',
  chest: 'Грудь',
  abs: 'Пресс',
  glutes: 'Ягодицы',
  quadriceps: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  calves: 'Икры'
}

const FRONT: WorkoutMuscleGroup[][] = [
  ['shoulders'],
  ['biceps', 'chest'],
  ['forearms', 'abs'],
  ['quadriceps'],
  ['calves']
]

const BACK: WorkoutMuscleGroup[][] = [
  ['traps'],
  ['triceps', 'lats'],
  ['lower_back'],
  ['glutes'],
  ['hamstrings'],
  ['calves']
]

function accentHeat(accent: string, percent: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return accent
  const bounded = Math.max(0, Math.min(100, percent))
  const alpha = Math.round(35 + (bounded / 100) * 190)
  return `${accent}${alpha.toString(16).padStart(2, '0')}`
}

export function WorkoutMuscleMap({
  groups
}: {
  groups: WorkoutReportMuscleGroup[]
}): React.JSX.Element {
  const theme = useTheme()
  const loadByGroup = new Map(groups.map((item) => [item.muscleGroup, item.loadPercent]))
  const hasLoad = groups.some((item) => item.sets > 0)

  return (
    <View
      accessibilityLabel="Карта нагрузки по группам мышц"
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
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>Карта нагрузки</Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>
          Чем ярче зона, тем больше её доля в выбранном периоде.
        </Text>
      </View>

      {hasLoad ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <BodySide title="Спереди" rows={FRONT} loadByGroup={loadByGroup} />
          <BodySide title="Сзади" rows={BACK} loadByGroup={loadByGroup} />
        </View>
      ) : (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          За выбранный период нагрузки пока нет.
        </Text>
      )}
    </View>
  )
}

function BodySide({
  title,
  rows,
  loadByGroup
}: {
  title: string
  rows: WorkoutMuscleGroup[][]
  loadByGroup: Map<WorkoutMuscleGroup, number>
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.raised,
        padding: 9,
        gap: 7
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' }}>
        {title}
      </Text>
      {rows.map((row, index) => (
        <View key={`${title}:${index}`} style={{ flexDirection: 'row', gap: 5 }}>
          {row.map((group) => {
            const percent = loadByGroup.get(group) ?? 0
            return (
              <View
                key={group}
                style={{
                  flex: 1,
                  minHeight: group === 'abs' || group === 'lats' ? 44 : 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: percent > 0 ? theme.accent : theme.border,
                  backgroundColor: percent > 0 ? accentHeat(theme.accent, percent) : theme.surface,
                  paddingHorizontal: 4,
                  paddingVertical: 5
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ color: theme.text, fontSize: 9, fontWeight: '800', textAlign: 'center' }}
                >
                  {LABELS[group] ?? group}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 8 }}>{Math.round(percent)}%</Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
