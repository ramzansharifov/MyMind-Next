import { Action } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { AppTextField } from '../../shared/ui/FormControls'
import { Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
export function SearchableFilterDropdown({
  label,
  value,
  options,
  placeholder,
  onChange
}: {
  label: string
  value: string
  options: readonly string[]
  placeholder: string
  onChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('ru')
  const visibleOptions = useMemo(
    () =>
      normalizedSearch
        ? options.filter((option) => option.toLocaleLowerCase('ru').includes(normalizedSearch))
        : options,
    [normalizedSearch, options]
  )
  const close = (): void => {
    setOpen(false)
    setSearch('')
  }
  return (
    <div
      className="ui-stack"
      style={{
        gap: 7
      }}
    >
      <Label>{label}</Label>
      <div className="ui-stack" style={{ position: 'relative' }}>
        <Action
          role={'button'}
          aria-label={label}
          aria-expanded={open}
          aria-selected={Boolean(value)}
          onClick={() => {
            if (open) close()
            else setOpen(true)
          }}
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingInline: 13,
            paddingRight: value ? 51 : 13,
            borderWidth: 1,
            borderColor: open || value ? theme.accent + '6A' : theme.border,
            borderRadius: 14,
            backgroundColor: value ? theme.accent + '0D' : theme.surface,
            opacity: 1
          }}
          pressedStyle={{
            backgroundColor: value ? theme.accent + '0D' : theme.raised,
            opacity: 0.76
          }}
        >
          <span
            className="ui-text"
            data-lines={1}
            style={{
              flex: '1 1 0%',
              color: value ? theme.text : theme.muted,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {value || placeholder}
          </span>
          {!value ? (
            <ChevronDown
              size={17}
              color={theme.muted}
              style={{ transform: 'rotate(' + (open ? '180deg' : '0deg') + ')' }}
            />
          ) : null}
        </Action>
        {value ? (
          <Action
            hitPadding={7}
            role={'button'}
            aria-label={`Сбросить фильтр «${label}»`}
            onClick={(event) => {
              event.stopPropagation()
              onChange('')
              close()
            }}
            style={{
              width: 28,
              height: 28,
              position: 'absolute',
              right: 13,
              top: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              backgroundColor: 'transparent'
            }}
            pressedStyle={{
              backgroundColor: theme.raised
            }}
          >
            <X size={15} color={theme.muted} />
          </Action>
        ) : null}
      </div>

      {open ? (
        <div
          className="ui-stack"
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <div
            className="ui-stack"
            style={{
              minHeight: 46,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingInline: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Search size={16} color={theme.muted} />
            <AppTextField
              value={search}
              onValueChange={setSearch}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={`Поиск: ${label.toLocaleLowerCase('ru')}`}
              style={{
                flex: 1,
                minHeight: 42,
                paddingInline: 0,
                paddingBlock: 8,
                borderWidth: 0,
                borderRadius: 0,
                backgroundColor: 'transparent',
                fontSize: 14
              }}
            />
          </div>

          <div
            className="ui-scroll"
            style={{
              maxHeight: 210
            }}
          >
            <div
              className="ui-stack ui-scroll-content"
              style={{
                padding: 6,
                gap: 3
              }}
            >
              {visibleOptions.length ? (
                visibleOptions.map((option) => {
                  const active = option === value
                  return (
                    <Action
                      key={option}
                      role={'button'}
                      aria-selected={active}
                      onClick={() => {
                        onChange(option)
                        close()
                      }}
                      style={{
                        minHeight: 42,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingInline: 10,
                        borderRadius: 10,
                        backgroundColor: active ? theme.accent + '12' : 'transparent'
                      }}
                      pressedStyle={{
                        backgroundColor: active ? theme.accent + '12' : theme.raised
                      }}
                    >
                      <span
                        className="ui-text"
                        data-lines={1}
                        style={{
                          flex: '1 1 0%',
                          color: active ? theme.accent : theme.text,
                          fontSize: 13.5,
                          fontWeight: active ? '700' : '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 1
                        }}
                      >
                        {option}
                      </span>
                      {active ? <Check size={15} color={theme.accent} /> : null}
                    </Action>
                  )
                })
              ) : (
                <span
                  className="ui-text"
                  style={{
                    paddingInline: 10,
                    paddingBlock: 14,
                    color: theme.muted,
                    fontSize: 12.5,
                    textAlign: 'center'
                  }}
                >
                  Ничего не найдено
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
