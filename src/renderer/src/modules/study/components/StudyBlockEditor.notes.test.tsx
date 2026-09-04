import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NOTE_BLOCK_TYPES } from '../../../../../shared/contracts/notes'
import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockAssetProvider } from './StudyBlockAssetProvider'
import { StudyBlockEditor } from './StudyBlockEditor'

const emptyDocument: StudyDocument = {
  version: 1,
  blocks: []
}

describe('StudyBlockEditor note configuration', () => {
  it('shows the same twelve block types as study', async () => {
    const user = userEvent.setup()

    render(
      <StudyBlockAssetProvider
        client={{
          importAsset: vi.fn(),
          saveRecordedAudio: vi.fn(),
          openAsset: vi.fn(),
          capabilities: { internalLinks: false }
        }}
      >
        <StudyBlockEditor
          materialId="note-one"
          document={emptyDocument}
          mode="edit"
          allowedBlockTypes={NOTE_BLOCK_TYPES}
          documentLabel="заметки"
          onChange={vi.fn()}
        />
      </StudyBlockAssetProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Добавить блок здесь' }))

    for (const label of [
      'Текст',
      'Заголовок',
      'Доска',
      'Разделитель',
      'Код',
      'Markdown',
      'LaTeX',
      'Mermaid',
      'Фото',
      'Видео',
      'Голосовое',
      'Файл'
    ]) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }

    expect(screen.queryByRole('menuitem', { name: 'Аудио' })).not.toBeInTheDocument()
  })
})
