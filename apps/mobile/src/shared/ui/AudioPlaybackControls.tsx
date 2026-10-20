import { View } from 'react-native'
import { Button, Label } from './primitives'

function playbackLabel(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Shared audio controls; playback engines stay in their platform adapters. */
export function AudioPlaybackControls({
  playing,
  loaded,
  currentTime,
  duration,
  error,
  toggle
}: {
  playing: boolean
  loaded: boolean
  currentTime: number
  duration: number
  error?: string | null
  toggle(): void
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={playing ? 'Пауза' : loaded ? 'Воспроизвести' : 'Загрузка…'}
          disabled={!loaded}
          onPress={toggle}
        />
      </View>
      <Label muted>
        {playbackLabel(currentTime)} / {playbackLabel(duration)}
      </Label>
      {error ? <Label muted>Не удалось воспроизвести: {error}</Label> : null}
    </View>
  )
}
