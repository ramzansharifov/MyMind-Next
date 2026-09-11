import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Pressable, Text, View } from 'react-native'
import { AppIcon } from './icons'
import { useTheme } from './theme'

export type ToastKind = 'success' | 'error'

export type ToastInput = {
  kind: ToastKind
  message: string
  key?: string
}

type ToastRecord = ToastInput & {
  id: string
}

type ToastApi = {
  show(input: ToastInput): void
  success(message: string, key?: string): void
  error(message: string, key?: string): void
}

const ToastContext = createContext<ToastApi | null>(null)

function toastId(input: ToastInput): string {
  return `${input.kind}:${input.key ?? 'app'}:${input.message}`
}

export function ToastProvider({ children }: PropsWithChildren): React.JSX.Element {
  const theme = useTheme()
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string): void => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (input: ToastInput): void => {
      const id = toastId(input)
      const previousTimer = timers.current.get(id)
      if (previousTimer) clearTimeout(previousTimer)

      setToasts((current) => {
        const withoutDuplicate = current.filter((toast) => toast.id !== id)
        return [{ ...input, id }, ...withoutDuplicate].slice(0, 4)
      })

      const delay = input.kind === 'error' ? 5200 : 2600
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id)
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }, delay)
      )
    },
    []
  )

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer)
      timers.current.clear()
    },
    []
  )

  const api: ToastApi = {
    show,
    success: (message, key) => show({ kind: 'success', message, key }),
    error: (message, key) => show({ kind: 'error', message, key })
  }

  return (
    <ToastContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 82,
            alignItems: 'flex-end',
            gap: 8
          }}
        >
          {toasts.map((toast) => {
            const color = toast.kind === 'error' ? theme.error : '#22c55e'
            return (
              <Pressable
                key={toast.id}
                accessibilityRole="alert"
                accessibilityLabel={toast.message}
                onPress={() => dismiss(toast.id)}
                style={({ pressed }) => ({
                  width: '100%',
                  maxWidth: 420,
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderWidth: 1,
                  borderColor: color + '35',
                  borderRadius: 16,
                  backgroundColor: theme.raised,
                  elevation: 12,
                  opacity: pressed ? 0.76 : 1
                })}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: color + '16'
                  }}
                >
                  <AppIcon
                    name={toast.kind === 'error' ? 'info' : 'check'}
                    size={16}
                    color={color}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: theme.text,
                    fontSize: 13.5,
                    lineHeight: 19,
                    fontWeight: '600'
                  }}
                >
                  {toast.message}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
