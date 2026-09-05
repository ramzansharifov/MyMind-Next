export interface StudyMermaidTemplate {
  id: string
  label: string
  source: string
}

export const STUDY_MERMAID_TEMPLATES: StudyMermaidTemplate[] = [
  {
    id: 'flowchart',
    label: 'Блок-схема',
    source: `flowchart LR
  A[Начало] --> B{Решение}
  B -->|Да| C[Продолжить]
  B -->|Нет| D[Завершить]`
  },
  {
    id: 'sequence',
    label: 'Последовательность',
    source: `sequenceDiagram
  participant U as Пользователь
  participant A as Приложение
  participant D as База данных

  U->>A: Открывает материал
  A->>D: Запрашивает данные
  D-->>A: Возвращает материал
  A-->>U: Показывает содержимое`
  },
  {
    id: 'class',
    label: 'Классы',
    source: `classDiagram
  class Material {
    +String id
    +String title
    +save()
  }

  class Block {
    +String id
    +String type
  }

  Material "1" *-- "many" Block`
  },
  {
    id: 'state',
    label: 'Состояния',
    source: `stateDiagram-v2
  [*] --> Черновик
  Черновик --> Сохранение
  Сохранение --> Сохранено
  Сохранение --> Ошибка
  Ошибка --> Сохранение`
  }
]
