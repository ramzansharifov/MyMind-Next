import { getBodyDiagram } from '@musclemap/assets'
import maleBack from '@musclemap/assets/bodies/male-back.webp'
import maleFront from '@musclemap/assets/bodies/male-front.webp'
import type { MuscleGroup as AnatomyMuscleGroup, MuscleMapValues } from '@musclemap/core'
import { BodyFigure } from '@musclemap/react'
import { useEffect, useId, useState } from 'react'

import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import type { ConcreteWorkoutMuscleZone } from './workout-muscle-artwork-model'

type AnatomyView = 'FRONT' | 'BACK'
type MuscleFamily = 'arms' | 'back' | 'torso' | 'legs'

interface AnatomyConfig {
  view: AnatomyView
  family: MuscleFamily
  groups: AnatomyMuscleGroup[]
  cropViewBox: string
}

const LEGACY_GROUP_EXPANSIONS: Partial<Record<WorkoutMuscleGroup, ConcreteWorkoutMuscleZone[]>> = {
  arms: ['shoulders', 'biceps', 'triceps', 'forearms'],
  back: ['traps', 'lats', 'lower_back'],
  legs: ['glutes', 'quadriceps', 'hamstrings', 'calves']
}

const ANATOMY_CONFIG: Record<ConcreteWorkoutMuscleZone, AnatomyConfig> = {
  shoulders: {
    view: 'FRONT',
    family: 'arms',
    groups: ['SHOULDERS_FRONT', 'SHOULDERS_SIDE'],
    cropViewBox: '120 135 470 610'
  },
  biceps: {
    view: 'FRONT',
    family: 'arms',
    groups: ['BICEPS'],
    cropViewBox: '120 175 470 590'
  },
  triceps: {
    view: 'BACK',
    family: 'arms',
    groups: ['TRICEPS'],
    cropViewBox: '115 165 470 610'
  },
  forearms: {
    view: 'FRONT',
    family: 'arms',
    groups: ['FOREARMS'],
    cropViewBox: '105 235 500 610'
  },
  traps: {
    view: 'BACK',
    family: 'back',
    groups: ['TRAPEZIUS'],
    cropViewBox: '250 105 525 565'
  },
  lats: {
    view: 'BACK',
    family: 'back',
    groups: ['LATS'],
    cropViewBox: '245 190 535 590'
  },
  lower_back: {
    view: 'BACK',
    family: 'back',
    groups: ['BACK_LOWER'],
    cropViewBox: '285 350 455 500'
  },
  chest: {
    view: 'FRONT',
    family: 'torso',
    groups: ['CHEST'],
    cropViewBox: '270 180 485 520'
  },
  abs: {
    view: 'FRONT',
    family: 'torso',
    groups: ['CORE'],
    cropViewBox: '300 310 430 500'
  },
  glutes: {
    view: 'BACK',
    family: 'legs',
    groups: ['GLUTES'],
    cropViewBox: '265 565 495 560'
  },
  quadriceps: {
    view: 'FRONT',
    family: 'legs',
    groups: ['QUADS'],
    cropViewBox: '245 585 535 760'
  },
  hamstrings: {
    view: 'BACK',
    family: 'legs',
    groups: ['HAMSTRINGS'],
    cropViewBox: '245 585 535 760'
  },
  calves: {
    view: 'BACK',
    family: 'legs',
    groups: ['CALVES'],
    cropViewBox: '245 760 535 690'
  }
}

const FAMILY_CROPS: Record<MuscleFamily, Record<AnatomyView, string>> = {
  arms: {
    FRONT: '105 125 520 680',
    BACK: '105 125 520 680'
  },
  back: {
    FRONT: '220 85 585 720',
    BACK: '220 85 585 720'
  },
  torso: {
    FRONT: '245 145 535 650',
    BACK: '245 145 535 650'
  },
  legs: {
    FRONT: '205 540 615 900',
    BACK: '205 540 615 900'
  }
}

const FALLBACK_ACCENT = '#8b5cf6'

function readAccentColor(): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') return FALLBACK_ACCENT

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--app-accent-500')
    .trim()

  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : FALLBACK_ACCENT
}

function useAccentColor(): string {
  const [accentColor, setAccentColor] = useState(readAccentColor)

  useEffect(() => {
    const root = document.documentElement
    const update = (): void => setAccentColor(readAccentColor())

    if (typeof MutationObserver === 'undefined') return

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['data-accent'] })
    return () => observer.disconnect()
  }, [])

  return accentColor
}

function expandWorkoutMuscleGroups(
  groups: readonly WorkoutMuscleGroup[]
): ConcreteWorkoutMuscleZone[] {
  const result: ConcreteWorkoutMuscleZone[] = []

  for (const group of groups) {
    const expanded = LEGACY_GROUP_EXPANSIONS[group] ?? [group as ConcreteWorkoutMuscleZone]
    for (const zone of expanded) {
      if (!result.includes(zone)) result.push(zone)
    }
  }

  return result
}

function preferredView(zones: ConcreteWorkoutMuscleZone[]): AnatomyView {
  const first = zones[0] ?? 'shoulders'
  let front = 0
  let back = 0

  for (const zone of zones) {
    if (ANATOMY_CONFIG[zone].view === 'FRONT') front += 1
    else back += 1
  }

  if (front === back) return ANATOMY_CONFIG[first].view
  return front > back ? 'FRONT' : 'BACK'
}

function artworkCrop(
  zones: ConcreteWorkoutMuscleZone[],
  view: AnatomyView,
  primary: ConcreteWorkoutMuscleZone
): string {
  if (zones.length <= 1) return ANATOMY_CONFIG[primary].cropViewBox

  const visibleZones = zones.filter((zone) => ANATOMY_CONFIG[zone].view === view)
  const families = new Set(visibleZones.map((zone) => ANATOMY_CONFIG[zone].family))

  if (families.size === 1) {
    const family = [...families][0]
    if (family) return FAMILY_CROPS[family][view]
  }

  const includesLegs = visibleZones.some((zone) => ANATOMY_CONFIG[zone].family === 'legs')
  const includesUpperBody = visibleZones.some((zone) => ANATOMY_CONFIG[zone].family !== 'legs')

  if (includesLegs && !includesUpperBody) return FAMILY_CROPS.legs[view]
  if (!includesLegs && includesUpperBody)
    return view === 'FRONT' ? '170 39 680 729' : '180 34 663 750'
  return view === 'FRONT' ? '170 39 680 1411' : '180 34 663 1440'
}

interface WorkoutMuscleArtworkProps {
  groups: readonly WorkoutMuscleGroup[]
  className?: string
  selected?: boolean
  variant?: 'icon' | 'card'
}

export function WorkoutMuscleArtwork({
  groups,
  className,
  selected = true,
  variant = 'icon'
}: WorkoutMuscleArtworkProps): React.JSX.Element {
  const accentColor = useAccentColor()
  const reactId = useId().replace(/:/g, '')
  const zones = expandWorkoutMuscleGroups(groups)
  const view = preferredView(zones)
  const primary =
    zones.find((zone) => ANATOMY_CONFIG[zone].view === view) ?? zones[0] ?? 'shoulders'
  const visibleZones = zones.filter((zone) => ANATOMY_CONFIG[zone].view === view)
  const anatomyGroups = [
    ...new Set(visibleZones.flatMap((zone) => ANATOMY_CONFIG[zone].groups))
  ] as AnatomyMuscleGroup[]
  const diagram = getBodyDiagram('MALE', view)
  const values = Object.fromEntries(
    anatomyGroups.map((group) => [group, { score: selected ? 100 : 68 }])
  ) as MuscleMapValues
  const visibleGroups = new Set<AnatomyMuscleGroup>(anatomyGroups)
  const cropViewBox = artworkCrop(zones, view, primary)

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none grid place-items-center overflow-hidden [&>svg]:h-full [&>svg]:w-full',
        variant === 'card' && 'h-[132px] w-full rounded-xl transition-all duration-200',
        variant === 'card' &&
          (selected
            ? 'bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_13%,transparent),transparent_68%)]'
            : 'bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_5%,transparent),transparent_68%)] group-hover:bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_8%,transparent),transparent_68%)]'),
        className
      )}
    >
      <BodyFigure
        diagram={diagram}
        values={values}
        colorModel="LOAD"
        monochromeColor={accentColor}
        monochromeBaseColor="#475569"
        visibleGroups={visibleGroups}
        activeGroup={null}
        glow={selected}
        idPrefix={`workout-muscle-${reactId}`}
        width={variant === 'card' ? 176 : 96}
        cropViewBox={cropViewBox}
        backgroundImage={view === 'FRONT' ? maleFront : maleBack}
        backgroundOpacity={variant === 'card' ? 0.78 : 0.88}
        backgroundGrayscale
        backgroundBrightness={variant === 'card' ? 0.78 : 0.86}
        onHover={() => undefined}
        onSelect={() => undefined}
      />
    </span>
  )
}
