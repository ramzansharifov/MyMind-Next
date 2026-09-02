import * as Collapsible from '@radix-ui/react-collapsible'
import { useMemo } from 'react'

import { formatMoneyMinor } from '../../../../../../shared/finance-money'
import { cn } from '../../../../shared/lib/cn'
import { Tooltip } from '../../../../shared/ui/tooltip'

interface ChartDatum {
  label: string
  value: number
  secondaryValue?: number
  detail?: string
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

type LineTone = 'accent' | 'income' | 'expense' | 'muted'

function toneColor(tone: LineTone): string {
  switch (tone) {
    case 'income':
      return '#34d399'
    case 'expense':
      return '#f87171'
    case 'muted':
      return 'var(--app-muted)'
    case 'accent':
      return 'var(--app-accent-500)'
  }
}

function sampleLabelIndexes(length: number, maximum = 6): Set<number> {
  if (length <= maximum) return new Set(Array.from({ length }, (_, index) => index))
  const result = new Set<number>([0, length - 1])
  for (let slot = 1; slot < maximum - 1; slot += 1) {
    result.add(Math.round((slot * (length - 1)) / (maximum - 1)))
  }
  return result
}

export function FinanceLineChart({
  data,
  currencyCode,
  ariaLabel = 'Динамика финансовых показателей',
  primaryLabel = 'Значение',
  secondaryLabel = 'Второе значение',
  primaryTone = 'accent',
  secondaryTone = 'income',
  includeZero = true
}: {
  data: ChartDatum[]
  currencyCode: string
  ariaLabel?: string
  primaryLabel?: string
  secondaryLabel?: string
  primaryTone?: LineTone
  secondaryTone?: LineTone
  includeZero?: boolean
}): React.JSX.Element {
  const geometry = useMemo(() => {
    const width = 760
    const height = 270
    const padding = { left: 78, right: 18, top: 18, bottom: 34 }
    const values = data.flatMap((point) =>
      point.secondaryValue === undefined ? [point.value] : [point.value, point.secondaryValue]
    )
    const rawMinimum = values.length > 0 ? Math.min(...values) : 0
    const rawMaximum = values.length > 0 ? Math.max(...values) : 1
    let minimum = includeZero ? Math.min(0, rawMinimum) : rawMinimum
    let maximum = includeZero ? Math.max(0, rawMaximum) : rawMaximum
    if (minimum === maximum) {
      const paddingValue = Math.max(1, Math.abs(minimum) * 0.08)
      minimum -= paddingValue
      maximum += paddingValue
    }
    const range = maximum - minimum
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    const point = (value: number, index: number): ChartPoint => ({
      x: padding.left + (index * chartWidth) / Math.max(1, data.length - 1),
      y: padding.top + ((maximum - value) / range) * chartHeight
    })
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = maximum - (range * index) / 4
      return {
        value,
        y: padding.top + (chartHeight * index) / 4
      }
    })
    return {
      width,
      height,
      padding,
      minimum,
      maximum,
      primary: data.map((entry, index) => point(entry.value, index)),
      secondary: data.map((entry, index) =>
        entry.secondaryValue === undefined ? null : point(entry.secondaryValue, index)
      ),
      ticks,
      zeroY:
        minimum <= 0 && maximum >= 0 ? padding.top + ((maximum - 0) / range) * chartHeight : null
    }
  }, [data, includeZero])

  if (data.length === 0) return <ChartEmpty label="Недостаточно данных для графика" />

  const primaryPath = geometry.primary
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const secondaryPoints = geometry.secondary.filter((point): point is ChartPoint => point !== null)
  const secondaryPath = secondaryPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const labelIndexes = sampleLabelIndexes(data.length)
  const hasSecondary = data.some((entry) => entry.secondaryValue !== undefined)

  return (
    <figure aria-label={ariaLabel} className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--app-muted)]">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: toneColor(primaryTone) }}
          />
          {primaryLabel}
        </span>
        {hasSecondary && (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-0.5 w-5 rounded-full"
              style={{ backgroundColor: toneColor(secondaryTone) }}
            />
            {secondaryLabel}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        className="h-64 w-full overflow-visible"
      >
        <title>{ariaLabel}</title>
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={geometry.padding.left}
              x2={geometry.width - geometry.padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--app-border)"
              strokeDasharray="4 5"
            />
            <text
              x={geometry.padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fill="var(--app-muted)"
              fontSize="10"
            >
              {formatMoneyMinor(Math.round(tick.value), currencyCode)}
            </text>
          </g>
        ))}
        {geometry.zeroY !== null && (
          <line
            x1={geometry.padding.left}
            x2={geometry.width - geometry.padding.right}
            y1={geometry.zeroY}
            y2={geometry.zeroY}
            stroke="var(--app-border-strong)"
            strokeWidth="1.2"
          />
        )}
        {hasSecondary && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={toneColor(secondaryTone)}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={primaryPath}
          fill="none"
          stroke={toneColor(primaryTone)}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {geometry.primary.map((point, index) => (
          <g key={`primary-${data[index].label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="var(--app-surface-raised)"
              stroke={toneColor(primaryTone)}
              strokeWidth="2"
            >
              <title>
                {data[index].label} · {primaryLabel}:{' '}
                {formatMoneyMinor(data[index].value, currencyCode)}
              </title>
            </circle>
            {labelIndexes.has(index) && (
              <text
                x={point.x}
                y={geometry.height - 8}
                textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
                fill="var(--app-muted)"
                fontSize="10"
              >
                {data[index].label}
              </text>
            )}
          </g>
        ))}
        {geometry.secondary.map((point, index) =>
          point && data[index].secondaryValue !== undefined ? (
            <circle
              key={`secondary-${data[index].label}-${index}`}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="var(--app-surface-raised)"
              stroke={toneColor(secondaryTone)}
              strokeWidth="1.8"
            >
              <title>
                {data[index].label} · {secondaryLabel}:{' '}
                {formatMoneyMinor(data[index].secondaryValue ?? 0, currencyCode)}
              </title>
            </circle>
          ) : null
        )}
      </svg>

      <Collapsible.Root className="text-xs text-[var(--app-muted)]">
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-left font-medium transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
          >
            Показать точные значения
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content></Collapsible.Content>
      </Collapsible.Root>
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
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {data.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,2fr)_auto] items-center gap-3 text-sm max-[620px]:grid-cols-[1fr_auto]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[var(--app-text)]">{item.label}</span>
              {item.detail && (
                <span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">
                  {item.detail}
                </span>
              )}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-overlay-subtle)] max-[620px]:order-3 max-[620px]:col-span-2">
              <Tooltip
                content={`${item.label}: ${formatMoneyMinor(item.value, currencyCode)}`}
                side="top"
              >
                <div
                  className="h-full rounded-full bg-[var(--app-accent-500)]"
                  style={{ width: `${Math.max(2, (Math.abs(item.value) / maximum) * 100)}%` }}
                  tabIndex={0}
                />
              </Tooltip>
            </div>
            <span className="font-medium text-[var(--app-text)] tabular-nums">
              {formatMoneyMinor(item.value, currencyCode)}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function FinanceBreakdownChart({
  data,
  currencyCode,
  ariaLabel
}: {
  data: Array<ChartDatum & { color?: string | null; sharePercent?: number }>
  currencyCode: string
  ariaLabel: string
}): React.JSX.Element {
  if (data.length === 0) return <ChartEmpty label="Нет данных для распределения" />
  const maximum = Math.max(1, ...data.map((item) => item.value))

  return (
    <figure aria-label={ariaLabel} className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="space-y-1.5">
          <div className="flex items-start justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color ?? 'var(--app-accent-500)' }}
              />
              <div className="min-w-0">
                <span className="block truncate text-[var(--app-text)]">{item.label}</span>
                <span className="text-[10px] text-[var(--app-muted)]">
                  {(item.sharePercent ?? 0).toFixed(1)}% от суммы
                </span>
              </div>
            </div>
            <span className="shrink-0 font-medium text-[var(--app-text)] tabular-nums">
              {formatMoneyMinor(item.value, currencyCode)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--app-overlay-subtle)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (item.value / maximum) * 100)}%`,
                backgroundColor: item.color ?? 'var(--app-accent-500)'
              }}
            />
          </div>
        </div>
      ))}
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
        {segments.map(({ item, part, offset }, index) => (
          <circle
            key={`${item.label}-${index}`}
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
        {data.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
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
    <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
      {label}
    </div>
  )
}
