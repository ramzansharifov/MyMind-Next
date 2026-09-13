import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import Svg, { Circle, Rect } from 'react-native-svg'
import type { WorkoutMuscleGroup, WorkoutMuscleZone } from '@mymind/contracts/workouts'

import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { expandWorkoutMuscleGroups, workoutMuscleLabel } from './workout-muscles'

type AnatomyView = 'front' | 'back'
type AnatomySex = 'male' | 'female'

export interface WorkoutMuscleMapExercise {
  title: string
  muscleGroups: readonly WorkoutMuscleGroup[]
}

interface ZoneShape {
  x: number
  y: number
  width: number
  height: number
  rx: number
}

interface ZonePlacement {
  zone: WorkoutMuscleZone
  view: AnatomyView
  shapes: ZoneShape[]
}

const ZONES: ZonePlacement[] = [
  {
    zone: 'shoulders',
    view: 'front',
    shapes: [
      { x: 52, y: 84, width: 34, height: 24, rx: 12 },
      { x: 134, y: 84, width: 34, height: 24, rx: 12 }
    ]
  },
  {
    zone: 'biceps',
    view: 'front',
    shapes: [
      { x: 39, y: 116, width: 24, height: 54, rx: 12 },
      { x: 157, y: 116, width: 24, height: 54, rx: 12 }
    ]
  },
  {
    zone: 'forearms',
    view: 'front',
    shapes: [
      { x: 34, y: 176, width: 22, height: 62, rx: 11 },
      { x: 164, y: 176, width: 22, height: 62, rx: 11 }
    ]
  },
  {
    zone: 'chest',
    view: 'front',
    shapes: [
      { x: 75, y: 100, width: 34, height: 48, rx: 15 },
      { x: 111, y: 100, width: 34, height: 48, rx: 15 }
    ]
  },
  {
    zone: 'abs',
    view: 'front',
    shapes: [{ x: 91, y: 153, width: 38, height: 65, rx: 16 }]
  },
  {
    zone: 'quadriceps',
    view: 'front',
    shapes: [
      { x: 72, y: 226, width: 34, height: 94, rx: 17 },
      { x: 114, y: 226, width: 34, height: 94, rx: 17 }
    ]
  },
  {
    zone: 'traps',
    view: 'back',
    shapes: [{ x: 84, y: 83, width: 52, height: 42, rx: 18 }]
  },
  {
    zone: 'triceps',
    view: 'back',
    shapes: [
      { x: 39, y: 116, width: 24, height: 56, rx: 12 },
      { x: 157, y: 116, width: 24, height: 56, rx: 12 }
    ]
  },
  {
    zone: 'lats',
    view: 'back',
    shapes: [
      { x: 73, y: 124, width: 34, height: 70, rx: 14 },
      { x: 113, y: 124, width: 34, height: 70, rx: 14 }
    ]
  },
  {
    zone: 'lower_back',
    view: 'back',
    shapes: [{ x: 91, y: 190, width: 38, height: 38, rx: 14 }]
  },
  {
    zone: 'glutes',
    view: 'back',
    shapes: [
      { x: 73, y: 224, width: 36, height: 45, rx: 16 },
      { x: 111, y: 224, width: 36, height: 45, rx: 16 }
    ]
  },
  {
    zone: 'hamstrings',
    view: 'back',
    shapes: [
      { x: 72, y: 275, width: 34, height: 76, rx: 17 },
      { x: 114, y: 275, width: 34, height: 76, rx: 17 }
    ]
  },
  {
    zone: 'calves',
    view: 'back',
    shapes: [
      { x: 75, y: 354, width: 28, height: 54, rx: 14 },
      { x: 117, y: 354, width: 28, height: 54, rx: 14 }
    ]
  }
]

function countLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'упражнений'
  if (mod10 === 1) return 'упражнение'
  if (mod10 >= 2 && mod10 <= 4) return 'упражнения'
  return 'упражнений'
}

export function WorkoutMuscleMapSheet({
  title,
  description,
  exercises,
  close
}: {
  title: string
  description: string
  exercises: readonly WorkoutMuscleMapExercise[]
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [view, setView] = useState<AnatomyView>('front')
  const [sex, setSex] = useState<AnatomySex>('male')
  const [selectedZone, setSelectedZone] = useState<WorkoutMuscleZone | null>(null)

  const analysis = useMemo(() => {
    const counts = new Map<WorkoutMuscleZone, number>()
    const names = new Map<WorkoutMuscleZone, string[]>()

    for (const exercise of exercises) {
      for (const zone of expandWorkoutMuscleGroups(exercise.muscleGroups)) {
        counts.set(zone, (counts.get(zone) ?? 0) + 1)
        const current = names.get(zone) ?? []
        if (!current.includes(exercise.title)) names.set(zone, [...current, exercise.title])
      }
    }

    const maxCount = Math.max(0, ...counts.values())
    return { counts, names, maxCount }
  }, [exercises])

  const visibleZones = ZONES.filter((item) => item.view === view)
  const activeZone =
    selectedZone && visibleZones.some((item) => item.zone === selectedZone)
      ? selectedZone
      : null
  const selectedExercises = activeZone ? (analysis.names.get(activeZone) ?? []) : []

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={title}
      description={description}
      icon="workouts"
      presentation="sheet"
      footer={<Button label="Закрыть" primary onPress={close} />}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label="Мужчина"
            selected={sex === 'male'}
            onPress={() => setSex('male')}
          />
          <Button
            label="Женщина"
            selected={sex === 'female'}
            onPress={() => setSex('female')}
          />
          <View style={{ width: 1, minHeight: 38, backgroundColor: theme.border }} />
          <Button
            label="Спереди"
            selected={view === 'front'}
            onPress={() => {
              setView('front')
              setSelectedZone(null)
            }}
          />
          <Button
            label="Сзади"
            selected={view === 'back'}
            onPress={() => {
              setView('back')
              setSelectedZone(null)
            }}
          />
        </View>

        {analysis.maxCount === 0 ? (
          <View
            style={{
              padding: 18,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <Label muted>В выбранной программе или тренировке нет упражнений с указанными мышечными зонами.</Label>
          </View>
        ) : (
          <>
            <View
              accessibilityLabel={`Карта мышц: ${sex === 'male' ? 'мужчина' : 'женщина'}, ${view === 'front' ? 'вид спереди' : 'вид сзади'}`}
              style={{
                alignItems: 'center',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 20,
                backgroundColor: theme.background,
                paddingVertical: 10
              }}
            >
              <Svg width="220" height="420" viewBox="0 0 220 420">
                <Circle cx="110" cy="38" r={sex === 'female' ? 23 : 25} fill={theme.raised} />
                <Rect x="101" y="61" width="18" height="20" rx="8" fill={theme.raised} />
                <Rect
                  x={sex === 'female' ? 69 : 65}
                  y="76"
                  width={sex === 'female' ? 82 : 90}
                  height="151"
                  rx={sex === 'female' ? 34 : 29}
                  fill={theme.raised}
                />
                <Rect x="32" y="82" width="29" height="160" rx="14" fill={theme.raised} />
                <Rect x="159" y="82" width="29" height="160" rx="14" fill={theme.raised} />
                <Rect x="70" y="218" width="38" height="194" rx="19" fill={theme.raised} />
                <Rect x="112" y="218" width="38" height="194" rx="19" fill={theme.raised} />

                {visibleZones.flatMap((placement) => {
                  const count = analysis.counts.get(placement.zone) ?? 0
                  const intensity =
                    count > 0 && analysis.maxCount > 0
                      ? 0.34 + (count / analysis.maxCount) * 0.58
                      : 0.08
                  return placement.shapes.map((shape, index) => (
                    <Rect
                      key={`${placement.zone}:${index}`}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      rx={shape.rx}
                      fill={count > 0 ? theme.accent : theme.muted}
                      fillOpacity={intensity}
                      stroke={activeZone === placement.zone ? theme.text : theme.border}
                      strokeWidth={activeZone === placement.zone ? 2.5 : 0.8}
                      onPress={() => setSelectedZone(placement.zone)}
                    />
                  ))
                })}
              </Svg>
            </View>

            <View style={{ gap: 8 }}>
              <Label title>Нагрузка по зонам</Label>
              {visibleZones
                .map((placement) => ({
                  zone: placement.zone,
                  count: analysis.counts.get(placement.zone) ?? 0
                }))
                .filter((item) => item.count > 0)
                .sort((left, right) => right.count - left.count)
                .map((item) => (
                  <Button
                    key={item.zone}
                    label={`${workoutMuscleLabel(item.zone)} · ${item.count} ${countLabel(item.count)}`}
                    selected={activeZone === item.zone}
                    onPress={() => setSelectedZone(item.zone)}
                  />
                ))}
            </View>

            {activeZone ? (
              <View
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.accent + '55',
                  borderRadius: 16,
                  backgroundColor: theme.accent + '0E',
                  gap: 8
                }}
              >
                <Label title>{workoutMuscleLabel(activeZone)}</Label>
                {selectedExercises.map((name) => (
                  <Text key={name} style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
                    • {name}
                  </Text>
                ))}
              </View>
            ) : (
              <Label muted>Нажмите на подсвеченную мышечную зону, чтобы увидеть упражнения.</Label>
            )}
          </>
        )}
      </ScrollView>
    </AppDialog>
  )
}
