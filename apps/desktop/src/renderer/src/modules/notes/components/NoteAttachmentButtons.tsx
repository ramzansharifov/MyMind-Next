import { File, Image, Mic, Music2, Video } from 'lucide-react'

import type { StudyAssetKind } from '../../../../../shared/contracts/study'
import { Tooltip } from '../../../shared/ui/tooltip'

interface NoteAttachmentButtonsProps {
  onAdd: (kind: StudyAssetKind | 'voice') => void
}

const attachments = [
  { kind: 'image', label: 'Добавить изображение', Icon: Image },
  { kind: 'video', label: 'Добавить видео', Icon: Video },
  { kind: 'audio', label: 'Добавить аудио', Icon: Music2 },
  { kind: 'voice', label: 'Добавить голосовую запись', Icon: Mic },
  { kind: 'file', label: 'Добавить файл', Icon: File }
] as const

export function NoteAttachmentButtons({ onAdd }: NoteAttachmentButtonsProps): React.JSX.Element {
  return (
    <section
      data-rich-text-settings-section
      className="space-y-2 border-b border-(--app-border) last:border-b-0"
    >
      <h3 className="text-[11px] font-semibold tracking-[0.08em] text-(--app-muted) uppercase">
        Вложения
      </h3>
      <div className="flex w-full justify-between gap-2">
        {attachments.map(({ kind, label, Icon }) => (
          <Tooltip key={kind} content={label} side="top">
            <button
              type="button"
              aria-label={label}
              data-rich-text-formatting-control
              className="flex size-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-workspace) text-(--app-muted) transition-colors outline-none hover:bg-white/[0.05] hover:text-(--app-accent-500) focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAdd(kind)}
            >
              <Icon aria-hidden="true" className="size-4" />
            </button>
          </Tooltip>
        ))}
      </div>
    </section>
  )
}
