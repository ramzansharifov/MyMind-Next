import type { CSSProperties } from 'react'

import type { DiaryPaperPattern, DiaryPaperTone } from '../../../../../shared/contracts/diary'

export interface DiaryPaperPatternMeta {
  label: string
  description: string
}

export interface DiaryPaperToneMeta {
  label: string
  description: string
  paper: string
  deep: string
  border: string
}

export const diaryPaperPatternMeta: Record<DiaryPaperPattern, DiaryPaperPatternMeta> = {
  ruled: { label: 'Линейка', description: 'Классические горизонтальные линии' },
  grid: { label: 'Клетка', description: 'Аккуратная квадратная сетка' },
  dots: { label: 'Точки', description: 'Лёгкая разметка без жёстких линий' },
  plain: { label: 'Чистый лист', description: 'Полностью без разметки' }
}

export const diaryPaperToneMeta: Record<DiaryPaperTone, DiaryPaperToneMeta> = {
  natural: {
    label: 'Натуральный',
    description: 'Текущий тёплый оттенок бумаги',
    paper: '#e8d3ad',
    deep: '#d4b985',
    border: '#bca274'
  },
  cream: {
    label: 'Кремовый',
    description: 'Светлее и мягче натурального',
    paper: '#f2e4c7',
    deep: '#e2cda9',
    border: '#c7ae82'
  },
  beige: {
    label: 'Бежевый',
    description: 'Более насыщенный песочный тон',
    paper: '#dfc69d',
    deep: '#cbb080',
    border: '#ad9166'
  },
  ivory: {
    label: 'Слоновая кость',
    description: 'Почти белая тёплая бумага',
    paper: '#f7f1e4',
    deep: '#e7dcc8',
    border: '#c9baa1'
  },
  white: {
    label: 'Белый',
    description: 'Чистая светлая бумага',
    paper: '#fffefb',
    deep: '#eeeae2',
    border: '#d5d0c8'
  }
}

type DiaryPaperCssVariables = CSSProperties & {
  '--diary-paper': string
  '--diary-paper-deep': string
  '--diary-paper-border': string
}

export function getDiaryPaperStyle(tone: DiaryPaperTone): DiaryPaperCssVariables {
  const meta = diaryPaperToneMeta[tone]
  return {
    '--diary-paper': meta.paper,
    '--diary-paper-deep': meta.deep,
    '--diary-paper-border': meta.border
  }
}
