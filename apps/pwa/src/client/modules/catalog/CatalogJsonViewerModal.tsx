import { useState } from 'react'
import * as Clipboard from '../../../platform/clipboard'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
export function CatalogJsonViewerModal({
  title,
  description,
  json,
  note,
  accessibilityLabel,
  close
}: {
  title: string
  description: string
  json: string
  note: string
  accessibilityLabel: string
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const copy = async (): Promise<void> => {
    setCopyError('')
    try {
      await Clipboard.setStringAsync(json)
      setCopied(true)
    } catch {
      setCopyError('Не удалось скопировать JSON в буфер обмена')
    }
  }
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={title}
      description={description}
      icon="json"
      presentation="sheet"
      footer={
        <>
          <Button label="Закрыть" onClick={close} />
          <Button
            label={copied ? 'Скопировано' : 'Копировать'}
            icon={copied ? 'check' : 'copy'}
            primary
            onClick={() => void copy()}
          />
        </>
      }
    >
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          padding: 14,
          gap: 10
        }}
      >
        <div
          className="ui-stack"
          style={{
            paddingInline: 12,
            paddingBlock: 10,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 13,
            backgroundColor: theme.background
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 11.5,
              lineHeight: '17px'
            }}
          >
            {note}
          </span>
        </div>

        <div
          className="ui-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.background
          }}
        >
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 14
            }}
          >
            <span
              className="ui-text"
              aria-label={accessibilityLabel}
              style={{
                color: theme.text,
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: '19px'
              }}
            >
              {json}
            </span>
          </div>
        </div>

        {copyError ? (
          <span
            className="ui-text"
            style={{
              color: theme.error,
              fontSize: 12.5,
              lineHeight: '18px'
            }}
          >
            {copyError}
          </span>
        ) : null}
      </div>
    </AppDialog>
  )
}
