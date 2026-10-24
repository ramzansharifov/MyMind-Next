import { TextControl } from '../../../ui/browser'
import { Button, Label } from './primitives'
import { useTheme } from './theme'
export function PreferredTimes({
  value,
  onChange,
  disabled
}: {
  value: unknown
  onChange(value: unknown): void
  disabled: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const times = (Array.isArray(value) ? value : []) as {
    unit: number | string
    time: string
  }[]
  return (
    <div
      className="ui-stack"
      style={{
        gap: 12
      }}
    >
      {times.map((entry, index) => (
        <div
          className="ui-stack"
          key={index}
          style={{
            gap: 8
          }}
        >
          <Label muted>Повторение {index + 1}</Label>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 8
            }}
          >
            <TextControl
              aria-label={`Номер единицы ${index + 1}`}
              disabled={!!disabled}
              inputMode={'numeric'}
              value={String(entry.unit)}
              onValueChange={(unit) =>
                onChange(times.map((item, i) => (i === index ? { ...item, unit } : item)))
              }
              style={{
                color: theme.text,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                width: 70,
                minHeight: 48
              }}
            ></TextControl>
            <TextControl
              aria-label={`Время повторения ${index + 1}`}
              disabled={!!disabled}
              placeholder={'09:00'}
              placeholderColor={theme.muted}
              value={entry.time}
              onValueChange={(time) =>
                onChange(times.map((item, i) => (i === index ? { ...item, time } : item)))
              }
              style={{
                flex: '1 1 0%',
                color: theme.text,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                minHeight: 48
              }}
            ></TextControl>
            <Button
              label="Убрать"
              disabled={disabled}
              onClick={() => onChange(times.filter((_, i) => i !== index))}
            />
          </div>
        </div>
      ))}
      <Button
        label="+ Время"
        disabled={disabled}
        onClick={() => onChange([...times, { unit: times.length + 1, time: '09:00' }])}
      />
    </div>
  )
}
