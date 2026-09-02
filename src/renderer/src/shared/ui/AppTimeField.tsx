import { AppSelect } from './AppSelect'

interface AppTimeFieldProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

const EMPTY_VALUE = '__empty__'
const hourOptions = [
  { value: EMPTY_VALUE, label: '—' },
  ...Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, '0')
    return { value, label: value }
  })
]
const minuteOptions = [
  { value: EMPTY_VALUE, label: '—' },
  ...Array.from({ length: 60 }, (_, minute) => {
    const value = String(minute).padStart(2, '0')
    return { value, label: value }
  })
]

function parseTime(value: string): { hour: string; minute: string } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  return { hour: match[1], minute: match[2] }
}

export function AppTimeField({
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className
}: AppTimeFieldProps): React.JSX.Element {
  const time = parseTime(value)

  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 ${className ?? ''}`}>
      <AppSelect
        ariaLabel={`${ariaLabel}: часы`}
        value={time?.hour ?? EMPTY_VALUE}
        options={hourOptions}
        disabled={disabled}
        triggerClassName="h-10"
        onValueChange={(hour) => {
          if (hour === EMPTY_VALUE) {
            onChange('')
            return
          }
          onChange(`${hour}:${time?.minute ?? '00'}`)
        }}
      />
      <span aria-hidden="true" className="text-sm font-semibold text-[var(--app-muted)]">
        :
      </span>
      <AppSelect
        ariaLabel={`${ariaLabel}: минуты`}
        value={time?.minute ?? EMPTY_VALUE}
        options={minuteOptions}
        disabled={disabled}
        triggerClassName="h-10"
        onValueChange={(minute) => {
          if (minute === EMPTY_VALUE) {
            onChange('')
            return
          }
          onChange(`${time?.hour ?? '00'}:${minute}`)
        }}
      />
    </div>
  )
}
