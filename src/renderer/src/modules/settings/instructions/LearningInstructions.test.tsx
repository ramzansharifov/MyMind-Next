import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { studyBlockDefinitions } from '../../study/lib/study-block-registry'
import {
  BoardsInstructionArticlePage,
  BoardsInstructionsPage,
  InstructionsOverviewPage,
  LearningInstructionArticlePage,
  LearningInstructionsPage
} from './LearningInstructions'
import { boardsInstructionArticles } from './boards-instruction-catalog'
import {
  blockLearningInstructionArticles,
  learningInstructionArticles
} from './learning-instruction-catalog'

describe('learning instructions', () => {
  it('contains one instruction for every registered study block type', () => {
    expect(blockLearningInstructionArticles.map((article) => article.id)).toEqual(
      studyBlockDefinitions.map((definition) => `block-${definition.type}`)
    )
    expect(learningInstructionArticles.length).toBe(studyBlockDefinitions.length + 5)
    expect(new Set(learningInstructionArticles.map((article) => article.id)).size).toBe(
      learningInstructionArticles.length
    )
  })

  it('opens the learning module from the instructions overview', async () => {
    const user = userEvent.setup()
    const onOpenLearning = vi.fn()
    const onOpenBoards = vi.fn()

    render(
      <InstructionsOverviewPage
        onBack={vi.fn()}
        onOpenLearning={onOpenLearning}
        onOpenBoards={onOpenBoards}
      />
    )

    expect(screen.getByRole('heading', { name: 'Инструкции' })).toBeInTheDocument()
    expect(screen.getByText('12 типов блоков')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Обучение/ }))

    expect(onOpenLearning).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /Доски/ }))
    expect(onOpenBoards).toHaveBeenCalledTimes(1)
  })

  it('filters topics and opens the selected block instruction', async () => {
    const user = userEvent.setup()
    const onOpenTopic = vi.fn()

    render(<LearningInstructionsPage onBack={vi.fn()} onOpenTopic={onOpenTopic} />)

    expect(screen.getByRole('heading', { name: 'Основы модуля' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Блоки материалов' })).toBeInTheDocument()

    await user.type(
      screen.getByRole('textbox', { name: 'Поиск по инструкциям обучения' }),
      'Mermaid'
    )

    expect(screen.queryByRole('button', { name: /Форматированный текст/ })).not.toBeInTheDocument()

    const mermaidTopic = screen.getByRole('button', { name: /Mermaid/ })

    await user.click(mermaidTopic)

    expect(onOpenTopic).toHaveBeenCalledWith('block-mermaid')
  })

  it('provides a searchable boards catalog and opens its deletion guide', async () => {
    const user = userEvent.setup()
    const onOpenTopic = vi.fn()

    render(<BoardsInstructionsPage onBack={vi.fn()} onOpenTopic={onOpenTopic} />)

    expect(boardsInstructionArticles.length).toBeGreaterThanOrEqual(7)
    expect(screen.getByRole('heading', { name: 'Рабочее пространство' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Связь с обучением' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Поиск по инструкциям досок' }), 'удаление')

    const deletionTopic = screen.getByRole('button', { name: /Удаление и синхронизация/ })
    await user.click(deletionTopic)
    expect(onOpenTopic).toHaveBeenCalledWith('boards-deletion-sync')
  })

  it('documents boards drag restrictions and returning to the source material', () => {
    const { rerender } = render(
      <BoardsInstructionArticlePage topicId="boards-sidebar" onBack={vi.fn()} />
    )

    expect(
      screen.getByRole('heading', { name: 'Перетаскивание папок и досок' })
    ).toBeInTheDocument()
    expect(screen.getByText(/вся её ветка зафиксированы/)).toBeInTheDocument()

    rerender(<BoardsInstructionArticlePage topicId="boards-study-links" onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Возврат к материалу' })).toBeInTheDocument()
    expect(screen.getByText(/кнопка «Назад к материалу»/)).toBeInTheDocument()
  })

  it('documents the complete bidirectional deletion behavior for study boards', () => {
    render(<BoardsInstructionArticlePage topicId="boards-deletion-sync" onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Удаление и синхронизация' })).toBeInTheDocument()
    expect(
      screen.getByText(/удаляется её холст и соответствующий блок «Доска» в учебном материале/)
    ).toBeInTheDocument()
    expect(screen.getByText(/пустая автоматически созданная папка удаляется/)).toBeInTheDocument()
  })

  it('documents fullscreen board controls and preserved canvas state', () => {
    render(<BoardsInstructionArticlePage topicId="boards-canvas" onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Полноэкранный режим' })).toBeInTheDocument()
    expect(screen.getByText(/Клавиша Esc также завершает полноэкранный режим/)).toBeInTheDocument()
    expect(screen.getByText(/не пересоздаёт tldraw/)).toBeInTheDocument()
  })

  it('navigates to and highlights a section from the contents list', async () => {
    const user = userEvent.setup()

    render(<LearningInstructionArticlePage topicId="learning-folder" onBack={vi.fn()} />)

    const heading = screen.getByRole('heading', { name: 'Основные действия' })
    const section = heading.closest('section')

    expect(section).not.toBeNull()

    const scrollIntoView = vi.fn()
    const animate = vi.fn()
    const cancel = vi.fn()

    Object.defineProperties(section as HTMLElement, {
      scrollIntoView: {
        configurable: true,
        value: scrollIntoView
      },
      getAnimations: {
        configurable: true,
        value: () => [{ cancel }]
      },
      animate: {
        configurable: true,
        value: animate
      }
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Перейти к разделу «Основные действия»'
      })
    )

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({
        block: 'start',
        inline: 'nearest'
      })
    )
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('renders full article sections and confirmed keyboard shortcuts', () => {
    render(<LearningInstructionArticlePage topicId="block-text" onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Форматированный текст' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Форматирование текста' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Горячие клавиши' })).toBeInTheDocument()
    expect(screen.getAllByText('Ctrl / Cmd').length).toBeGreaterThan(0)
    expect(screen.getByText('Открыть выбор внутренней ссылки.')).toBeInTheDocument()
  })
})
