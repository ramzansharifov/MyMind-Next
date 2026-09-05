import type { CSSProperties } from 'react'

import type { DiaryCoverTone } from '../../../../../shared/contracts/diary'

export interface DiaryCoverToneMeta {
  label: string
  description: string
  base: string
  light: string
  dark: string
  border: string
  stitch: string
  spineLight: string
  spineDark: string
}

export const diaryCoverToneMeta: Record<DiaryCoverTone, DiaryCoverToneMeta> = {
  walnut: {
    label: 'Орех',
    description: 'Классический тёмно-коричневый переплёт',
    base: '#4a2f1d',
    light: '#6a432a',
    dark: '#2f1d13',
    border: '#1f120a',
    stitch: '#a87b49',
    spineLight: '#6a432a',
    spineDark: '#2a160c'
  },
  cognac: {
    label: 'Коньячный',
    description: 'Тёплая рыжевато-коричневая кожа',
    base: '#75472a',
    light: '#a36b3f',
    dark: '#4a2817',
    border: '#321a0f',
    stitch: '#d3a16a',
    spineLight: '#9b6238',
    spineDark: '#3f2113'
  },
  burgundy: {
    label: 'Бордовый',
    description: 'Глубокий винный оттенок переплёта',
    base: '#5a2730',
    light: '#7d3946',
    dark: '#35161c',
    border: '#241015',
    stitch: '#b8797f',
    spineLight: '#74313c',
    spineDark: '#301319'
  },
  graphite: {
    label: 'Графит',
    description: 'Нейтральный почти чёрный переплёт',
    base: '#343435',
    light: '#515154',
    dark: '#202022',
    border: '#151516',
    stitch: '#77777b',
    spineLight: '#48484b',
    spineDark: '#1d1d1f'
  },
  forest: {
    label: 'Лесной',
    description: 'Спокойный тёмно-зелёный переплёт',
    base: '#30483b',
    light: '#4a6957',
    dark: '#1d2d24',
    border: '#142019',
    stitch: '#789682',
    spineLight: '#42604f',
    spineDark: '#19271f'
  }
}

type DiaryCoverCssVariables = CSSProperties & {
  '--diary-cover-base': string
  '--diary-cover-light': string
  '--diary-cover-dark': string
  '--diary-cover-border': string
  '--diary-cover-stitch': string
  '--diary-cover-spine-light': string
  '--diary-cover-spine-dark': string
}

export function getDiaryCoverStyle(tone: DiaryCoverTone): DiaryCoverCssVariables {
  const meta = diaryCoverToneMeta[tone]
  return {
    '--diary-cover-base': meta.base,
    '--diary-cover-light': meta.light,
    '--diary-cover-dark': meta.dark,
    '--diary-cover-border': meta.border,
    '--diary-cover-stitch': meta.stitch,
    '--diary-cover-spine-light': meta.spineLight,
    '--diary-cover-spine-dark': meta.spineDark
  }
}
