import { useEffect, useRef } from 'react'
import { ToastContainer, toast, type ToastOptions } from 'react-toastify'

import type { OperationFeedback } from '../../../../shared/contracts/system'

const SUCCESS_OPTIONS: ToastOptions = { autoClose: 2600 }
const ERROR_OPTIONS: ToastOptions = { autoClose: 5200 }

function feedbackToastId(feedback: OperationFeedback): string {
  return `${feedback.kind}:${feedback.key ?? 'app'}:${feedback.message}`
}

export function AppToastNotifications(): React.JSX.Element {
  const activeErrorsRef = useRef(new Set<string>())

  useEffect(() => {
    const subscribe = window.api?.system?.onOperationFeedback
    if (!subscribe) return

    return subscribe((feedback) => {
      const toastId = feedbackToastId(feedback)

      if (feedback.kind === 'error') {
        if (activeErrorsRef.current.has(toastId)) return
        activeErrorsRef.current.add(toastId)
        toast.error(feedback.message, {
          ...ERROR_OPTIONS,
          toastId,
          onClose: () => {
            activeErrorsRef.current.delete(toastId)
          }
        })
        return
      }

      toast.success(feedback.message, { ...SUCCESS_OPTIONS, toastId })
    })
  }, [])

  return (
    <ToastContainer
      position="bottom-right"
      newestOnTop
      hideProgressBar
      closeButton={false}
      closeOnClick
      pauseOnHover
      pauseOnFocusLoss={false}
      draggable={false}
      limit={4}
      className="mymind-toast-container"
      toastClassName="mymind-toast"
      bodyClassName="mymind-toast-body"
    />
  )
}
