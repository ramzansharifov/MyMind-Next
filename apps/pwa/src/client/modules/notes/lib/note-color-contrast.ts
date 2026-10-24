/** Accept opaque palette colors and RGB styles pasted into the note. */
export function getReadableNoteTextColor(color: string): string | undefined {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  let components: number[]
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
    components = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16))
  } else {
    const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i)?.[1]
    if (!rgb) return undefined
    const parts = rgb.trim().replace(/[,/]/g, ' ').split(/\s+/)
    const number = (value: string, scale: number): number =>
      value.endsWith('%') ? (Number(value.slice(0, -1)) * scale) / 100 : Number(value)
    if (parts.length !== 3 && parts.length !== 4) return undefined
    if (parts.length === 4 && number(parts[3], 1) !== 1) return undefined
    components = parts.slice(0, 3).map((value) => number(value, 255))
    if (components.some((value) => !Number.isFinite(value) || value < 0 || value > 255))
      return undefined
  }
  const channels = components.map((component) => {
    const value = component / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return luminance > 0.179 ? '#202127' : '#f2f3f5'
}
