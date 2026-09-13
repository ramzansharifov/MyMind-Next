import { Text, View } from 'react-native'
import { WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'

type InstructionTopic = {
  title: string
  description: string
  points: string[]
}

const studyTopics: InstructionTopic[] = [
  {
    title: 'Библиотека и структура',
    description: 'Как устроены папки и материалы.',
    points: [
      'Папки объединяют материалы и могут содержать вложенные папки.',
      'Материал — отдельная страница из независимых блоков.',
      'На главной обучения поиск работает по названию и полному пути элемента.',
      'Недавние материалы помогают быстро вернуться к последним изменениям.'
    ]
  },
  {
    title: 'Создание и управление',
    description: 'Основные действия с элементами библиотеки.',
    points: [
      'Создавайте папку или материал через кнопку добавления в текущем разделе.',
      'Меню элемента позволяет изменить свойства, открыть код, создать копию, переместить или удалить элемент.',
      'Внутри папки порядок соседних элементов можно менять командами перемещения.',
      'При переходе через глобальный поиск порядок не меняется: сначала откройте нужную папку.'
    ]
  },
  {
    title: 'Материал: чтение, редактирование и код',
    description: 'Три режима одного и того же материала.',
    points: [
      'В режиме редактирования содержимое автоматически сохраняется после изменений.',
      'Режим чтения показывает итоговый материал без редакторских элементов.',
      'Режим кода позволяет менять структуру папки или материала через DSL и применять изменения к реальным данным.',
      'PDF создаётся из текущего материала, включая поддерживаемые диаграммы.'
    ]
  },
  {
    title: 'Ссылки, доски и фокус',
    description: 'Связи между блоками и другими разделами MyMind.',
    points: [
      'Внутренние ссылки открывают другой материал или конкретный блок и сохраняют возможность вернуться назад.',
      'Блок доски открывает связанную доску без создания дубликата данных.',
      'Фокус-режим скрывает оболочку приложения и оставляет максимум места содержимому.',
      'На Android системная кнопка «Назад» сначала закрывает фокус или текущий материал.'
    ]
  }
]

const boardTopics: InstructionTopic[] = [
  {
    title: 'Пространство досок',
    description: 'Самостоятельные и связанные доски.',
    points: [
      'Обычные папки и доски создаются и полностью управляются в модуле «Доски».',
      'Доски из учебных материалов отображаются здесь как те же самые связанные объекты.',
      'Главная досок показывает статистику, недавние холсты и структуру верхнего уровня.',
      'Глобальный поиск учитывает название, тип доски и путь родительских папок.'
    ]
  },
  {
    title: 'Папки и порядок',
    description: 'Организация рабочего пространства.',
    points: [
      'В обычной папке можно создавать вложенные папки и доски.',
      'Меню элемента позволяет редактировать свойства, менять порядок и удалять доступные элементы.',
      'Управляемые учебные ветки защищены от действий, которые нарушили бы связь с исходным материалом.',
      'При поиске по всему пространству изменение порядка отключено — сначала откройте родительскую папку.'
    ]
  },
  {
    title: 'Холст и сохранение',
    description: 'Работа с tldraw на телефоне.',
    points: [
      'Холст использует локально упакованные ресурсы и работает без загрузки служебных шрифтов из сети.',
      'Изменения сохраняются автоматически; рядом с названием отображается состояние сохранения.',
      'Перед закрытием доски приложение принудительно завершает незаписанное сохранение.',
      'Если приложение уходит в фон, MyMind также пытается сохранить текущий снимок холста.'
    ]
  },
  {
    title: 'Фокус и синхронизация связей',
    description: 'Полноэкранная работа и связанные учебные доски.',
    points: [
      'Фокус-режим разворачивает холст на доступную область и скрывает навигацию MyMind.',
      'Системная кнопка «Назад» на Android сначала выходит из фокуса, затем закрывает доску.',
      'Удаление связанной доски синхронизируется с исходным учебным блоком согласно правилам связи.',
      'Системные и управляемые папки нельзя удалить как обычные пользовательские папки.'
    ]
  }
]

function InstructionTopicCard({ topic }: { topic: InstructionTopic }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.border
      }}
    >
      <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>
        {topic.title}
      </Text>
      <Text style={{ marginTop: 3, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
        {topic.description}
      </Text>
      <View style={{ marginTop: 10, gap: 7 }}>
        {topic.points.map((point) => (
          <View key={point} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ color: theme.accent, fontSize: 14, lineHeight: 19 }}>•</Text>
            <Text style={{ flex: 1, color: theme.text, fontSize: 12.5, lineHeight: 19 }}>
              {point}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function InstructionGroup({
  title,
  description,
  icon,
  topics
}: {
  title: string
  description: string
  icon: 'study' | 'boards'
  topics: InstructionTopic[]
}): React.JSX.Element {
  return (
    <WorkspacePanel title={title} description={description} icon={icon}>
      <View>
        {topics.map((topic, index) => (
          <View key={topic.title} style={index === topics.length - 1 ? { marginBottom: -14 } : undefined}>
            <InstructionTopicCard topic={topic} />
          </View>
        ))}
      </View>
    </WorkspacePanel>
  )
}

export function SettingsInstructions(): React.JSX.Element {
  return (
    <View style={{ gap: 14 }}>
      <InstructionGroup
        title="Обучение"
        description="Структура библиотеки, материалы, режим кода и связанные блоки."
        icon="study"
        topics={studyTopics}
      />
      <InstructionGroup
        title="Доски"
        description="Папки, холсты, сохранение, фокус и интеграция с обучением."
        icon="boards"
        topics={boardTopics}
      />
    </View>
  )
}
