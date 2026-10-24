import { Action, DialogLayer } from '../../ui/browser'
import type { ReactNode } from 'react'
import { navigationRoutes, routeIcons, routeTitles, type Route } from './navigation'
import { AppIcon, type AppIconName } from '../shared/ui/icons'
import { useTheme } from '../shared/ui/theme'
const moduleRoutes = navigationRoutes.filter((route) => route !== 'settings')
export interface NavigationItem<T extends string> {
  route: T
  title: string
  icon: AppIconName
}
export function AppNavigationDrawer<T extends string>({
  visible,
  currentRoute,
  entries,
  settingsEntry,
  versionLabel,
  updateContent,
  close,
  navigate
}: {
  visible: boolean
  currentRoute: T
  entries: readonly NavigationItem<T>[]
  settingsEntry: NavigationItem<T>
  versionLabel: string
  updateContent?: ReactNode
  close(): void
  navigate(route: T): void
}): React.JSX.Element {
  const theme = useTheme()
  const renderRoute = (entry: NavigationItem<T>): React.JSX.Element => {
    const route = entry.route
    const selected = route === currentRoute
    return (
      <Action
        key={route}
        role={'button'}
        aria-label={entry.title}
        aria-selected={selected}
        onClick={() => navigate(route)}
        style={{
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingInline: 12,
          paddingBlock: 8,
          borderWidth: 1,
          borderColor: selected ? theme.accent + '33' : 'transparent',
          borderRadius: 14,
          backgroundColor: selected ? theme.accent + '14' : 'transparent',
          opacity: 1
        }}
        pressedStyle={{
          backgroundColor: selected ? theme.accent + '14' : theme.raised,
          opacity: 0.78
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: 34,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: selected ? theme.accent + '35' : theme.border,
            borderRadius: 11,
            backgroundColor: selected ? theme.accent + '12' : theme.background
          }}
        >
          <AppIcon name={entry.icon} size={18} color={selected ? theme.accent : theme.muted} />
        </div>

        <span
          className="ui-text"
          data-lines={1}
          style={{
            flex: '1 1 0%',
            color: selected ? theme.text : theme.muted,
            fontSize: 15,
            lineHeight: '20px',
            fontWeight: selected ? '700' : '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {entry.title}
        </span>

        {selected ? (
          <div
            className="ui-stack"
            aria-label={'Текущий раздел'}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: theme.accent
            }}
          ></div>
        ) : null}
      </Action>
    )
  }
  return (
    <DialogLayer open={visible} transition={'fade'} onClose={close}>
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          flexDirection: 'row',
          backgroundColor: '#00000073'
        }}
      >
        <div
          className="ui-stack ui-safe-area"
          style={{
            width: '84%',
            maxWidth: 360,
            backgroundColor: theme.surface,
            borderRightWidth: 1,
            borderRightColor: theme.border
          }}
        >
          <div
            className="ui-stack"
            style={{
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingInline: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <div
              className="ui-stack"
              style={{
                width: 42,
                height: 42,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.accent + '30',
                borderRadius: 13,
                backgroundColor: theme.accent + '12'
              }}
            >
              <AppIcon name="brand" size={22} strokeWidth={2} color={theme.accent} />
            </div>

            <div
              className="ui-stack"
              style={{
                flex: '1 1 0%'
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: theme.text,
                  fontSize: 17,
                  fontWeight: 700
                }}
              >
                MyMind
              </span>
              <span
                className="ui-text"
                style={{
                  marginTop: 2,
                  color: theme.muted,
                  fontSize: 11
                }}
              >
                {versionLabel}
              </span>
            </div>

            <Action
              role={'button'}
              aria-label={'Закрыть меню'}
              onClick={close}
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: 'transparent',
                opacity: 1
              }}
              pressedStyle={{
                backgroundColor: theme.raised,
                opacity: 0.75
              }}
            >
              <AppIcon name="close" size={20} color={theme.muted} />
            </Action>
          </div>

          {updateContent}

          <div
            className="ui-scroll"
            data-testid={'mymind-navigation-items'}
            style={{
              flex: '1 1 0%',
              minHeight: 0
            }}
          >
            <div
              className="ui-stack ui-scroll-content"
              style={{
                padding: 12,
                paddingBottom: 18,
                gap: 4
              }}
            >
              {entries.map(renderRoute)}

              <div
                className="ui-stack"
                style={{
                  height: 1,
                  marginInline: 4,
                  marginBlock: 8,
                  backgroundColor: theme.border
                }}
              ></div>

              {renderRoute(settingsEntry)}
            </div>
          </div>
        </div>

        <Action
          role={'button'}
          aria-label={'Закрыть меню навигации'}
          onClick={close}
          style={{
            flex: '1 1 0%'
          }}
        ></Action>
      </div>
    </DialogLayer>
  )
}
export function MobileNavigationDrawer({
  visible,
  currentRoute,
  versionLabel,
  close,
  navigate
}: {
  visible: boolean
  currentRoute: Route
  versionLabel?: string
  close(): void
  navigate(route: Route): void
}): React.JSX.Element {
  return (
    <AppNavigationDrawer
      visible={visible}
      currentRoute={currentRoute}
      close={close}
      navigate={navigate}
      entries={moduleRoutes.map((route) => ({
        route,
        title: routeTitles[route],
        icon: routeIcons[route]
      }))}
      settingsEntry={{ route: 'settings', title: routeTitles.settings, icon: routeIcons.settings }}
      versionLabel={versionLabel ?? ''}
    />
  )
}
