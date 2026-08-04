import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NOTE_BLOCK_TYPES } from '../../../../../shared/contracts/notes'
import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

const emptyDocument: StudyDocument = {
  version: 1,
  blocks: []
}

describe('StudyBlockEditor note configuration', () => {
  it('shows only the seven block types supported by notes', async () => {
    const user = userEvent.setup()

    render(
      <StudyBlockEditor
        materialId="note-one"
        document={emptyDocument}
        mode="edit"
        allowedBlockTypes={NOTE_BLOCK_TYPES}
        documentLabel="заметки"
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Добавить блок здесь' }))

    for (const label of ['Текст', 'Заголовок', 'Фото', 'Аудио', 'Видео', 'Файл', 'Разделитель']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }

    for (const label of ['Код', 'Markdown', 'LaTeX', 'Mermaid', 'Доска']) {
      expect(screen.queryByRole('menuitem', { name: label })).not.toBeInTheDocument()
    }
  })
})
