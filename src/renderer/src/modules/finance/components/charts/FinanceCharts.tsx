import { useMemo } from 'react'

import { formatMoneyMinor } from '../../../../../../shared/finance-money'
import { cn } from '../../../../shared/lib/cn'

interface ChartDatum {
  label: string
  value: number
  secondaryValue?: number
}

interface ChartPoint {
  x: number
  y: number
}

interface DonutSegment {
  item: ChartDatum & { color?: string | null }
  part: number
  offset: number
  end: number
}

export function FinanceLineChart({
  data,
  currencyCode,
  ariaLabel = 'Динамика финансовых показателей'
}: {
  data: ChartDatum[]
  currencyCode: string
  ariaLabel?: string
}): React.JSX.Element {
  const geometry = useMemo(() => {
    const width = 720
    const height = 220
    const padding = 24
    const values = data.flatMap((point) => [point.value, point.secondaryValue ?? point.value])
    const minimum = Math.min(0, ...values)
    const maximum = Math.max(1, ...values)
    const range = maximum - minimum || 1
    const point = (value: number, index: number): ChartPoint => ({
      x: padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1),
      y: height - padding - ((value - minimum) / range) * (height - padding * 2)
    })
    return {
      width,
      height,
      primary: data.map((entry, index) => point(entry.value, index)),
      secondary: data.map((entry, index) => point(entry.secondaryValue ?? entry.value, index))
    }
  }, [data])

  if (data.length === 0) return <ChartEmpty label="Недостаточно данных для графика" />
  const primaryPath = geometry.primary
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const secondaryPath = geometry.secondary
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <figure aria-label={ariaLabel} className="space-y-3">
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        className="h-56 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <title>{ariaLabel}</title>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="24"
            x2="696"
            y1={geometry.height * fraction}
            y2={geometry.height * fraction}
            stroke="var(--app-border)"
            strokeDasharray="4 5"
          />
        ))}
        <path
          d={secondaryPath}
          fill="none"
          stroke="currentColor"
          className="text-emerald-400/80"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={primaryPath}
          fill="none"
          stroke="var(--app-accent-500)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {geometry.primary.map((point, index) => (
          <circle
            key={data[index].label}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--app-surface-raised)"
            stroke="var(--app-accent-500)"
            strokeWidth="2"
          >
            <title>
              {data[index].label}: {formatMoneyMinor(data[index].value, currencyCode)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-muted)]">
        {data.slice(0, 8).map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <details className="text-xs text-[var(--app-muted)]">
        <summary className="cursor-pointer">Табличные данные</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-1">Период</th>
                <th>Значение</th>
                {data.some((item) => item.secondaryValue != null) && <th>Второе значение</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.label}>
                  <td className="py-1">{item.label}</td>
                  <td>{formatMoneyMinor(item.value, currencyCode)}</td>
                  {item.secondaryValue != null && (
                    <td>{formatMoneyMinor(item.secondaryValue, currencyCode)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

export function FinanceBarChart({
  data,
  currencyCode,
  ariaLabel
}: {
  data: ChartDatum[]
  currencyCode: string
  ariaLabel: string
}): React.JSX.Element {
  const maximum = Math.max(1, ...data.map((item) => Math.abs(item.value)))
  if (data.length === 0) return <ChartEmpty label="Нет данных за выбранный период" />
  return (
    <figure aria-label={ariaLabel} className="space-y-3">
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(8rem,2fr)_auto] items-center gap-3 text-sm max-[560px]:grid-cols-[1fr_auto]"
          >
            <span className="truncate text-[var(--app-text)]">{item.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--app-overlay-subtle)] max-[560px]:order-3 max-[560px]:col-span-2">
              <div
                className="h-full rounded-full bg-[var(--app-accent-500)]"
                style={{ width: `${Math.max(2, (Math.abs(item.value) / maximum) * 100)}%` }}
                title={`${item.label}: ${formatMoneyMinor(item.value, currencyCode)}`}
              />
            </div>
            <span className="font-medium text-[var(--app-text)] tabular-nums">
              {formatMoneyMinor(item.value, currencyCode)}
            </span>
          </div>
        ))}
      </div>
      <details className="text-xs text-[var(--app-muted)]">
        <summary className="cursor-pointer">Табличные данные</summary>
        <ul className="mt-2 space-y-1">
          {data.map((item) => (
            <li key={item.label}>
              {item.label}: {formatMoneyMinor(item.value, currencyCode)}
            </li>
          ))}
        </ul>
      </details>
    </figure>
  )
}

export function FinanceDonutChart({
  data,
  currencyCode,
  ariaLabel
}: {
  data: Array<ChartDatum & { color?: string | null }>
  currencyCode: string
  ariaLabel: string
}): React.JSX.Element {
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  const segments = data.reduce<DonutSegment[]>((result, item) => {
    const offset = result.at(-1)?.end ?? 0
    const part = (item.value / Math.max(1, total)) * 100
    return [...result, { item, part, offset, end: offset + part }]
  }, [])
  if (total <= 0) return <ChartEmpty label="Нет данных для распределения" />
  return (
    <figure
      aria-label={ariaLabel}
      className="grid grid-cols-[12rem_minmax(0,1fr)] items-center gap-5 max-[560px]:grid-cols-1"
    >
      <svg viewBox="0 0 120 120" className="mx-auto size-44 -rotate-90" role="img">
        <title>{ariaLabel}</title>
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="var(--app-overlay-subtle)"
          strokeWidth="18"
        />
        {segments.map(({ item, part, offset }) => (
          <circle
            key={item.label}
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke={item.color ?? 'var(--app-accent-500)'}
            strokeWidth="18"
            pathLength="100"
            strokeDasharray={`${part} ${100 - part}`}
            strokeDashoffset={-offset}
          >
            <title>
              {item.label}: {formatMoneyMinor(item.value, currencyCode)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-[var(--app-muted)]">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: item.color ?? 'var(--app-accent-500)' }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-medium text-[var(--app-text)] tabular-nums">
              {formatMoneyMinor(item.value, currencyCode)}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function FinanceProgress({
  value,
  warning = false,
  exceeded = false,
  className
}: {
  value: number
  warning?: boolean
  exceeded?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-[var(--app-overlay-subtle)]', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width]',
          exceeded ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-[var(--app-accent-500)]'
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function ChartEmpty({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
      {label}
    </div>
  )
}
