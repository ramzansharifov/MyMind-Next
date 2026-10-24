import { type PropsWithChildren, useCallback, useRef, useState } from 'react'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { ConfirmationContext, type ConfirmationOptions } from './confirmation-context'
export type { ConfirmationOptions } from './confirmation-context'
import { messageFor } from './form-model'

type StoredConfirmation = ConfirmationOptions & {
  resolve(result: boolean): void
}

export function ConfirmationProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [request, setRequest] = useState<StoredConfirmation | null>(null)
  const activeRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> =>
      new Promise((resolve) => {
        if (activeRef.current) {
          resolve(false)
          return
        }
        activeRef.current = true
        setError(null)
        setRequest({ ...options, resolve })
      }),
    []
  )

  const close = useCallback(
    (result: boolean): void => {
      if (busy) return
      setRequest((current) => {
        current?.resolve(result)
        activeRef.current = false
        return null
      })
      setError(null)
    },
    [busy]
  )

  const runConfirm = useCallback(async (): Promise<void> => {
    if (!request || busy) return
    setBusy(true)
    setError(null)
    try {
      await request.onConfirm()
      request.resolve(true)
      activeRef.current = false
      setRequest(null)
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }, [busy, request])

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <DeleteConfirmationDialog
        open={request !== null}
        title={request?.title ?? ''}
        description={request?.description ?? ''}
        subject={request?.subject}
        confirmLabel={request?.confirmLabel}
        submittingLabel={request?.submittingLabel}
        tone={request?.tone}
        notice={request?.notice}
        busy={busy}
        error={error}
        onOpenChange={(open) => {
          if (!open) close(false)
        }}
        onConfirm={() => {
          void runConfirm()
        }}
      />
    </ConfirmationContext.Provider>
  )
}
