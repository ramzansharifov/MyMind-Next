import { useState } from 'react'

import { Tooltip } from '../../../shared/ui/tooltip'
import { NoteNameDialog } from './NoteNameDialog'

interface NoteTitleProps {
  title: string
  onRename: (title: string) => Promise<void>
}

export function NoteTitle({ title, onRename }: NoteTitleProps): React.JSX.Element {
  const [renameOpen, setRenameOpen] = useState(false)

  return (
    <div className="min-w-0 flex-1">
      <h1 className="note-title">
        <Tooltip content="Изменить название" side="bottom" align="start" disabled={renameOpen}>
          <button
            type="button"
            className="note-title-button"
            aria-label={`Изменить название заметки: ${title}`}
            aria-haspopup="dialog"
            onClick={() => setRenameOpen(true)}
          >
            {title}
          </button>
        </Tooltip>
      </h1>
      <NoteNameDialog
        open={renameOpen}
        title="Переименовать заметку"
        label="Название заметки"
        initialValue={title}
        confirmLabel="Сохранить"
        onOpenChange={setRenameOpen}
        onConfirm={onRename}
      />
    </div>
  )
}
