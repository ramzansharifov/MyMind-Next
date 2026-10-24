import { Action } from '../../../ui/browser'
import { DEFAULT_NOTE_APPEARANCE, type NoteAppearance } from '@mymind/contracts/notes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { getReadableNoteTextColor } from './lib/note-color-contrast'
const colors = [
  { name: 'Тема', value: 'theme' },
  { name: 'Без заливки', value: null },
  { name: 'Белый', value: '#ffffff' },
  { name: 'Кремовый', value: '#efe9dd' },
  { name: 'Тёмный', value: '#0d0f12' },
  { name: 'Графит', value: '#171a20' },
  { name: 'Серый', value: '#21252e' },
  { name: 'Хвойный', value: '#182620' },
  { name: 'Синий', value: '#1d2238' },
  { name: 'Розовый', value: '#302329' }
]
export function MobileNoteAppearanceSheet({
  value,
  close,
  onChange
}: {
  value: NoteAppearance
  close(): void
  onChange(value: NoteAppearance): void
}): React.JSX.Element {
  const theme = useTheme()
  const update = (patch: Partial<NoteAppearance>): void => onChange({ ...value, ...patch })
  return (
    <AppDialog
      open
      title="Вид заметки"
      icon="settings"
      presentation="sheet"
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            padding: 16,
            gap: 18,
            paddingBottom: 28
          }}
        >
          <Label muted>Варианты</Label>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 8
            }}
          >
            {(
              [
                ['canvas', 'Полотно'],
                ['sheet', 'Лист'],
                ['card', 'Карточка']
              ] as const
            ).map(([variant, label]) => (
              <Action
                key={variant}
                role={'button'}
                aria-label={`Вид заметки: ${label}`}
                aria-selected={value.variant === variant}
                onClick={() =>
                  update({
                    variant,
                    paperColor:
                      value.paperColor && value.paperColor !== 'theme'
                        ? value.paperColor
                        : variant === 'canvas'
                          ? null
                          : 'theme'
                  })
                }
                style={{
                  flex: '1 1 0%',
                  minHeight: 94,
                  padding: 10,
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderWidth: value.variant === variant ? 2 : 1,
                  borderColor: value.variant === variant ? theme.accent : theme.border,
                  backgroundColor: theme.surface
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    width: 30,
                    height: 38,
                    borderRadius: variant === 'card' ? 6 : 1,
                    borderWidth: variant === 'canvas' ? 0 : variant === 'card' ? 2 : 1,
                    borderColor: theme.muted,
                    gap: 5,
                    justifyContent: 'center',
                    padding: 5
                  }}
                >
                  {[0, 1, 2].map((index) => (
                    <div
                      className="ui-stack"
                      key={index}
                      style={{
                        height: 2,
                        width: index === 2 ? 10 : 18,
                        backgroundColor: value.variant === variant ? theme.accent : theme.muted
                      }}
                    ></div>
                  ))}
                </div>
                <span
                  className="ui-text"
                  style={{
                    color: value.variant === variant ? theme.accent : theme.text,
                    fontSize: 12
                  }}
                >
                  {label}
                </span>
              </Action>
            ))}
          </div>
          <Label muted>{value.variant === 'canvas' ? 'Узор полотна' : 'Узор листа'}</Label>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            {(
              [
                ['none', 'Без узора'],
                ['dots', 'Точки'],
                ['grid', 'Клетка']
              ] as const
            ).map(([paperPattern, label]) => (
              <Button
                key={paperPattern}
                label={label}
                selected={value.paperPattern === paperPattern}
                onClick={() => update({ paperPattern })}
              />
            ))}
          </div>
          <Label muted>{value.variant === 'canvas' ? 'Цвет полотна' : 'Цвет листа'}</Label>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            {colors.map((option) => {
              const selected = value.paperColor === option.value
              const background =
                option.value === 'theme' ? theme.surface : (option.value ?? theme.background)
              return (
                <Action
                  key={option.name}
                  role={'button'}
                  aria-label={`Цвет листа: ${option.name}`}
                  aria-selected={selected}
                  onClick={() => update({ paperColor: option.value })}
                  style={{
                    width: '30%',
                    minHeight: 84,
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? theme.accent : theme.border,
                    padding: 8,
                    gap: 8,
                    backgroundColor: theme.surface
                  }}
                >
                  <div
                    className="ui-stack"
                    style={{
                      flex: '1 1 0%',
                      minHeight: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: background,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color:
                          (option.value &&
                            option.value !== 'theme' &&
                            getReadableNoteTextColor(option.value)) ||
                          theme.text,
                        fontSize: 18
                      }}
                    >
                      Aa
                    </span>
                  </div>
                  <span
                    className="ui-text"
                    data-lines={1}
                    style={{
                      color: selected ? theme.accent : theme.muted,
                      fontSize: 11,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 1
                    }}
                  >
                    {option.name}
                  </span>
                </Action>
              )
            })}
          </div>
          <Button
            label="Сбросить вид"
            icon="reset"
            onClick={() => onChange({ ...DEFAULT_NOTE_APPEARANCE })}
          />
        </div>
      </div>
    </AppDialog>
  )
}
