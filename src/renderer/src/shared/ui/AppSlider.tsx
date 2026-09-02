import * as Slider from '@radix-ui/react-slider'

import { cn } from '../lib/cn'

interface AppSliderProps {
  value: number
  min: number
  max: number
  onValueChange: (value: number) => void
  ariaLabel: string
  step?: number
  disabled?: boolean
  className?: string
}

export function AppSlider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  ariaLabel,
  disabled = false,
  className
}: AppSliderProps): React.JSX.Element {
  return (
    <Slider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn(
        'relative flex h-5 w-full touch-none items-center select-none',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
        className
      )}
      onValueChange={(next) => {
        const first = next[0]
        if (first !== undefined) onValueChange(first)
      }}
    >
      <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-[var(--app-control)]">
        <Slider.Range className="absolute h-full bg-violet-500" />
      </Slider.Track>
      <Slider.Thumb
        aria-label={ariaLabel}
        className="block size-4 rounded-full border-2 border-violet-400 bg-[var(--app-surface-raised)] shadow-sm transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-violet-500/35"
      />
    </Slider.Root>
  )
}
