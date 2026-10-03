import * as ToggleGroup from '@radix-ui/react-toggle-group'

import { Tooltip } from '../../../../shared/ui/tooltip'
import './FontSizeRuler.css'

interface FontSizeRulerProps {
  value: string
  onChange: (value: string) => void
}

const sizes = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]

function sizeInPixels(value: string): number {
  const match = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value)
  if (!match) return 16
  return Number(match[1]) * (match[2] === 'px' ? 1 : 16)
}

export function FontSizeRuler({ value, onChange }: FontSizeRulerProps): React.JSX.Element {
  const currentSize = sizeInPixels(value)
  const selectedIndex = sizes.reduce(
    (nearest, size, index) =>
      Math.abs(size - currentSize) < Math.abs(sizes[nearest] - currentSize) ? index : nearest,
    0
  )

  function selectSize(size: number): void {
    onChange(`${size / 16}rem`)
  }

  return (
    <div className="rich-text-size-ruler">
      <div className="rich-text-size-ruler__controls">
        <Tooltip content="Уменьшить размер текста" side="top">
          <button
            type="button"
            aria-label="Уменьшить размер текста"
            className="rich-text-size-ruler__step rich-text-size-ruler__step--small"
            disabled={selectedIndex === 0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectSize(sizes[selectedIndex - 1])}
          >
            <span aria-hidden="true">а</span>
          </button>
        </Tooltip>

        <ToggleGroup.Root
          type="single"
          value={String(sizes[selectedIndex])}
          aria-label="Размер текста"
          className="rich-text-size-ruler__ticks"
          onValueChange={(nextSize) => {
            if (nextSize) selectSize(Number(nextSize))
          }}
        >
          {sizes.map((size, index) => (
            <Tooltip content={`${size} пикселей`} side="top" key={size}>
              <ToggleGroup.Item
                value={String(size)}
                aria-label={`Размер текста ${size} пикселей`}
                data-passed={index <= selectedIndex ? 'true' : 'false'}
                data-selected={index === selectedIndex ? 'true' : 'false'}
                className="rich-text-size-ruler__tick"
                onMouseDown={(event) => event.preventDefault()}
              >
                <span aria-hidden="true" style={{ height: `${8 + index * 1.2}px` }} />
              </ToggleGroup.Item>
            </Tooltip>
          ))}
        </ToggleGroup.Root>

        <Tooltip content="Увеличить размер текста" side="top">
          <button
            type="button"
            aria-label="Увеличить размер текста"
            className="rich-text-size-ruler__step rich-text-size-ruler__step--large"
            disabled={selectedIndex === sizes.length - 1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectSize(sizes[selectedIndex + 1])}
          >
            <span aria-hidden="true">А</span>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
