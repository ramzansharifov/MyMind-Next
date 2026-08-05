import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NOTE_BLOCK_TYPES } from '../../../../../shared/contracts/notes'
import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

const emptyDocument: StudyDocument = {
  version: 1,
  blocks: []
}

function getColumnItems(menu: HTMLElement, columnId: string): string[] {
  const column = menu.querySelector<HTMLElement>(`[data-study-block-menu-column="${columnId}"]`)

  expect(column).not.toBeNull()

  return within(column!)
    .getAllByRole('menuitem')
    .map((item) => item.textContent?.trim() ?? '')
}

describe('StudyBlockEditor insert menu', () => {
  it('groups the full Study block catalog into three ordered columns', async () => {
    const user = userEvent.setup()

    render(
      <StudyBlockEditor
        materialId="material-menu"
        document={emptyDocument}
        mode="edit"
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Добавить блок здесь' }))

    const menu = screen.getByRole('menu')
    const columns = menu.querySelectorAll<HTMLElement>('[data-study-block-menu-column]')

    expect(Array.from(columns, (column) => column.dataset.studyBlockMenuColumn)).toEqual([
      'primary',
      'technical',
      'media'
    ])
    expect(getColumnItems(menu, 'primary')).toEqual(['Текст', 'Заголовок', 'Доска', 'Разделитель'])
    expect(getColumnItems(menu, 'technical')).toEqual(['Код', 'Markdown', 'LaTeX', 'Mermaid'])
    expect(getColumnItems(menu, 'media')).toEqual(['Фото', 'Видео', 'Аудио', 'Файл'])
  })

  it('omits empty columns when the editor allows only Notes block types', async () => {
    const user = userEvent.setup()

    render(
      <StudyBlockEditor
        materialId="note-menu"
        document={emptyDocument}
        mode="edit"
        allowedBlockTypes={NOTE_BLOCK_TYPES}
        documentLabel="заметки"
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Добавить блок здесь' }))

    const menu = screen.getByRole('menu')
    const columns = menu.querySelectorAll<HTMLElement>('[data-study-block-menu-column]')

    expect(Array.from(columns, (column) => column.dataset.studyBlockMenuColumn)).toEqual([
      'primary',
      'media'
    ])
    expect(getColumnItems(menu, 'primary')).toEqual(['Текст', 'Заголовок', 'Доска', 'Разделитель'])
    expect(getColumnItems(menu, 'media')).toEqual(['Фото', 'Видео', 'Аудио', 'Файл'])
    expect(menu.querySelector('[data-study-block-menu-column="technical"]')).toBeNull()
  })
})
