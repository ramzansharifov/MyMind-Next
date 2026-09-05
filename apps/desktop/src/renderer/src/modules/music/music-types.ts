import type { MusicType } from '../../../../shared/contracts/music'

export const MUSIC_TYPE_OPTIONS: Array<{ value: MusicType; label: string }> = [
  { value: 'track', label: 'Трек' },
  { value: 'album', label: 'Альбом' },
  { value: 'ep', label: 'EP' },
  { value: 'single', label: 'Сингл' }
]

const MUSIC_TYPE_LABELS = Object.fromEntries(
  MUSIC_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<MusicType, string>

export function musicTypeLabel(type: MusicType): string {
  return MUSIC_TYPE_LABELS[type]
}
