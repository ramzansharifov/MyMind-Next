export function groupColorValue(value: string | null | undefined, accent: string): string {
  // Desktop keeps the legacy "violet" group value semantic: it follows the app accent.
  if (!value || value === 'accent' || value === 'violet') return accent

  const colors: Record<string, string> = {
    blue: '#60a5fa',
    cyan: '#22d3ee',
    emerald: '#34d399',
    amber: '#fbbf24',
    orange: '#fb923c',
    rose: '#fb7185',
    pink: '#f472b6'
  }

  return colors[value] ?? accent
}
