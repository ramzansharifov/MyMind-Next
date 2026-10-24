import { motionValue, mapValue, motion, transformValue } from 'framer-motion'
import {
  TextControl,
  Action,
  stopMotion,
  playMotion,
  motionStep,
  sequenceMotion,
  waitMotion
} from '../../../ui/browser'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { useTheme } from './theme'
import type { SwipeTabFeedback } from './useSwipeTabFeedback'
export interface SwipeTabBarItem<T extends string = string> {
  id: T
  label: string
  disabled?: boolean
}
export interface InlineTabSearchConfig {
  value: string
  onValueChange(value: string): void
  placeholder?: string
  accessibilityLabel?: string
}
function InlineSearchField({
  search,
  close
}: {
  search: InlineTabSearchConfig
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minWidth: 0,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 10,
        paddingRight: 4,
        borderRadius: 12,
        backgroundColor: theme.raised
      }}
    >
      <Search size={17} color={theme.muted} />
      <TextControl
        autoFocus={true}
        aria-label={search.accessibilityLabel ?? 'Поиск'}
        placeholder={search.placeholder ?? 'Поиск…'}
        placeholderColor={theme.muted}
        value={search.value}
        onValueChange={search.onValueChange}
        enterKeyHint={'search'}
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          height: 40,
          paddingBlock: 0,
          color: theme.text,
          fontSize: 14
        }}
      ></TextControl>
      <Action
        hitPadding={4}
        role={'button'}
        aria-label={'Закрыть поиск'}
        onClick={close}
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: 'transparent',
          opacity: 1
        }}
        pressedStyle={{
          backgroundColor: theme.surface,
          opacity: 0.72
        }}
      >
        <X size={17} color={theme.muted} />
      </Action>
    </div>
  )
}
export function SearchableHeaderRow({
  children,
  search,
  minHeight = 54,
  borderRadius = 15,
  paddingHorizontal = 7,
  paddingVertical = 6,
  gap = 9
}: {
  children: ReactNode
  search: InlineTabSearchConfig
  minHeight?: number
  borderRadius?: number
  paddingHorizontal?: number
  paddingVertical?: number
  gap?: number
}): React.JSX.Element {
  const theme = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchProgress] = useState(() => motionValue(0))
  useEffect(
    () => () => {
      stopMotion(searchProgress)
    },
    [searchProgress]
  )
  const openSearch = (): void => {
    stopMotion(searchProgress)
    searchProgress.set(0)
    setSearchOpen(true)
    requestAnimationFrame(() => {
      playMotion(
        motionStep(searchProgress, 1, {
          duration: 230 / 1000,
          ease: 'easeOut',
          type: 'tween'
        })
      )
    })
  }
  const closeSearch = (): void => {
    search.onValueChange('')
    playMotion(
      motionStep(searchProgress, 0, {
        duration: 220 / 1000,
        ease: 'easeInOut',
        type: 'tween'
      }),
      ({ finished }) => {
        if (finished) setSearchOpen(false)
      }
    )
  }
  const normalOpacity = mapValue(searchProgress, [0, 0.72, 1], [1, 0.12, 0], {
    clamp: true
  })
  const normalTranslateX = mapValue(searchProgress, [0, 1], [0, -54], {
    clamp: true
  })
  const searchOpacity = mapValue(searchProgress, [0, 0.28, 1], [0, 0.82, 1], {
    clamp: true
  })
  const searchTranslateX = mapValue(searchProgress, [0, 1], [62, 0], {
    clamp: true
  })
  return (
    <div
      className="ui-stack"
      style={{
        position: 'relative',
        minHeight: minHeight,
        overflow: 'hidden',
        paddingInline: paddingHorizontal,
        paddingBlock: paddingVertical,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: borderRadius,
        backgroundColor: theme.surface
      }}
    >
      <motion.div
        className="ui-stack"
        style={{
          minHeight: minHeight - paddingVertical * 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: gap,
          opacity: normalOpacity,
          x: normalTranslateX,
          pointerEvents: searchOpen ? 'none' : 'auto'
        }}
      >
        {children}
        <Action
          role={'button'}
          aria-label={'Поиск'}
          aria-selected={Boolean(search.value)}
          onClick={openSearch}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: search.value ? theme.accent + '18' : 'transparent',
            opacity: 1
          }}
          pressedStyle={{
            backgroundColor: search.value ? theme.accent + '18' : theme.raised,
            opacity: 0.72
          }}
        >
          <Search size={18} color={search.value ? theme.accent : theme.muted} />
        </Action>
      </motion.div>

      {searchOpen ? (
        <motion.div
          className="ui-stack"
          style={{
            position: 'absolute',
            top: paddingVertical,
            right: paddingHorizontal,
            bottom: paddingVertical,
            left: paddingHorizontal,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: searchOpacity,
            x: searchTranslateX
          }}
        >
          <InlineSearchField search={search} close={closeSearch} />
        </motion.div>
      ) : null}
    </div>
  )
}
export function SwipeTabBar<T extends string, I extends SwipeTabBarItem<T>>({
  items,
  value,
  onChange,
  feedback,
  renderIcon,
  trailing,
  search,
  onSearchOpenChange
}: {
  items: readonly I[]
  value: T
  onChange(value: T): void
  feedback?: SwipeTabFeedback<T> | null
  renderIcon(item: I, selected: boolean): ReactNode
  trailing?: ReactNode
  search?: InlineTabSearchConfig
  onSearchOpenChange?(open: boolean): void
}): React.JSX.Element {
  const theme = useTheme()
  const [progress] = useState(() => motionValue(0))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchProgress] = useState(() => motionValue(0))
  useEffect(() => {
    if (!feedback) return
    stopMotion(progress)
    progress.set(0)
    playMotion(
      sequenceMotion([
        motionStep(progress, 1, {
          duration: 240 / 1000,
          ease: 'easeOut',
          type: 'tween'
        }),
        waitMotion(620),
        motionStep(progress, 2, {
          duration: 280 / 1000,
          ease: 'easeInOut',
          type: 'tween'
        })
      ])
    )
    return () => {
      stopMotion(progress)
    }
  }, [feedback, progress])
  useEffect(
    () => () => {
      stopMotion(progress)
      stopMotion(searchProgress)
    },
    [progress, searchProgress]
  )
  const shownItem = useMemo(
    () => (feedback ? (items.find((item) => item.id === feedback.value) ?? null) : null),
    [feedback, items]
  )
  const openSearch = (): void => {
    if (!search || shownItem) return
    stopMotion(searchProgress)
    searchProgress.set(0)
    setSearchOpen(true)
    onSearchOpenChange?.(true)
    requestAnimationFrame(() => {
      playMotion(
        motionStep(searchProgress, 1, {
          duration: 230 / 1000,
          ease: 'easeOut',
          type: 'tween'
        })
      )
    })
  }
  const closeSearch = (): void => {
    if (!search) return
    search.onValueChange('')
    playMotion(
      motionStep(searchProgress, 0, {
        duration: 220 / 1000,
        ease: 'easeInOut',
        type: 'tween'
      }),
      ({ finished }) => {
        if (finished) {
          setSearchOpen(false)
          onSearchOpenChange?.(false)
        }
      }
    )
  }
  const directionSign = feedback?.direction === 'previous' ? 1 : -1
  const normalExit = 52 * directionSign
  const normalEnter = -52 * directionSign
  const feedbackEnter = -56 * directionSign
  const feedbackExit = 56 * directionSign
  const normalOpacity = mapValue(progress, [0, 0.42, 0.58, 1.42, 1.58, 2], [1, 0, 0, 0, 0, 1], {
    clamp: true
  })
  const normalTranslateX = mapValue(
    progress,
    [0, 0.48, 0.52, 1.48, 1.52, 2],
    [0, normalExit, normalEnter, normalEnter, normalEnter, 0],
    {
      clamp: true
    }
  )
  const feedbackOpacity = mapValue(progress, [0, 0.38, 1.5, 2], [0, 1, 1, 0], {
    clamp: true
  })
  const feedbackTranslateX = mapValue(
    progress,
    [0, 0.5, 1.5, 2],
    [feedbackEnter, 0, 0, feedbackExit],
    {
      clamp: true
    }
  )
  const feedbackScale = mapValue(progress, [0, 0.5, 1.5, 2], [0.985, 1, 1, 0.985], {
    clamp: true
  })
  const searchNormalOpacity = mapValue(searchProgress, [0, 0.72, 1], [1, 0.12, 0], {
    clamp: true
  })
  const searchNormalTranslateX = mapValue(searchProgress, [0, 1], [0, -54], {
    clamp: true
  })
  const searchOpacity = mapValue(searchProgress, [0, 0.28, 1], [0, 0.82, 1], {
    clamp: true
  })
  const searchTranslateX = mapValue(searchProgress, [0, 1], [62, 0], {
    clamp: true
  })
  return (
    <div
      className="ui-stack"
      role={'tablist'}
      style={{
        position: 'relative',
        minHeight: 50,
        overflow: 'hidden',
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <motion.div
        className="ui-stack"
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          opacity: transformValue(() => normalOpacity.get() * searchNormalOpacity.get()),
          x: transformValue(() => normalTranslateX.get() + searchNormalTranslateX.get()),
          pointerEvents: shownItem || searchOpen ? 'none' : 'auto'
        }}
      >
        {items.map((item) => {
          const selected = item.id === value
          return (
            <Action
              key={item.id}
              role={'tab'}
              aria-label={item.label}
              aria-selected={selected}
              aria-disabled={item.disabled}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              style={{
                flex: '1 1 0%',
                minWidth: 0,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: selected ? theme.accent + '18' : 'transparent',
                opacity: item.disabled ? 0.38 : 1
              }}
              pressedStyle={{
                backgroundColor: selected ? theme.accent + '18' : theme.raised,
                opacity: item.disabled ? 0.38 : 0.72
              }}
            >
              {renderIcon(item, selected)}
            </Action>
          )
        })}
        {trailing}
        {search ? (
          <Action
            role={'button'}
            aria-label={'Поиск'}
            aria-selected={Boolean(search.value)}
            onClick={openSearch}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: search.value ? theme.accent + '18' : 'transparent',
              opacity: 1
            }}
            pressedStyle={{
              backgroundColor: search.value ? theme.accent + '18' : theme.raised,
              opacity: 0.72
            }}
          >
            <Search size={19} color={search.value ? theme.accent : theme.muted} />
          </Action>
        ) : null}
      </motion.div>

      {shownItem && !searchOpen ? (
        <motion.div
          className="ui-stack"
          aria-hidden={true}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            opacity: feedbackOpacity,
            x: feedbackTranslateX,
            scale: feedbackScale,
            pointerEvents: 'none'
          }}
        >
          <div
            className="ui-stack"
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '18'
            }}
          >
            {renderIcon(shownItem, true)}
          </div>
          <div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              minWidth: 0
            }}
          >
            <span
              className="ui-text"
              data-lines={1}
              style={{
                color: theme.text,
                fontSize: 13.5,
                lineHeight: '19px',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {shownItem.label}
            </span>
          </div>
        </motion.div>
      ) : null}

      {search && searchOpen ? (
        <motion.div
          className="ui-stack"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: searchOpacity,
            x: searchTranslateX
          }}
        >
          <InlineSearchField search={search} close={closeSearch} />
        </motion.div>
      ) : null}
    </div>
  )
}
