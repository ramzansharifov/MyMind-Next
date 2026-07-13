import type { StudyFolderIconName } from '../../../../../shared/contracts/study'

export interface StudyFolderIconOption {
  value: StudyFolderIconName
  label: string
}

export const STUDY_FOLDER_ICON_OPTIONS = [
  {
    value: 'folder',
    label: 'Папка'
  },
  {
    value: 'book',
    label: 'Книга'
  },
  {
    value: 'graduation',
    label: 'Учёба'
  },
  {
    value: 'science',
    label: 'Наука'
  },
  {
    value: 'calculator',
    label: 'Математика'
  },
  {
    value: 'code',
    label: 'Программирование'
  },
  {
    value: 'languages',
    label: 'Языки'
  },
  {
    value: 'history',
    label: 'История'
  },
  {
    value: 'microscope',
    label: 'Исследование'
  },
  {
    value: 'art',
    label: 'Искусство'
  },
  {
    value: 'music',
    label: 'Музыка'
  },
  {
    value: 'work',
    label: 'Работа'
  },
  {
    value: 'archive',
    label: 'Архив'
  },
  {
    value: 'physics',
    label: 'Физика'
  },
  {
    value: 'brain',
    label: 'Мышление'
  },
  {
    value: 'organization',
    label: 'Организация'
  },
  {
    value: 'photography',
    label: 'Фотография'
  },
  {
    value: 'finance',
    label: 'Финансы'
  },
  {
    value: 'biology',
    label: 'Биология'
  },
  {
    value: 'geography',
    label: 'География'
  },
  {
    value: 'medicine',
    label: 'Медицина'
  },
  {
    value: 'ideas',
    label: 'Идеи'
  },
  {
    value: 'travel',
    label: 'Путешествия'
  },
  {
    value: 'notes',
    label: 'Заметки'
  },
  {
    value: 'design',
    label: 'Дизайн'
  },
  {
    value: 'projects',
    label: 'Проекты'
  },
  {
    value: 'law',
    label: 'Право'
  },
  {
    value: 'favorites',
    label: 'Избранное'
  },
  {
    value: 'goals',
    label: 'Цели'
  },
  {
    value: 'sport',
    label: 'Спорт'
  }
] as const satisfies readonly StudyFolderIconOption[]
