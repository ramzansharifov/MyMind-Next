import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import { AppIcon, type AppIconName } from './icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from './theme'

export type AppDialogTone = 'default' | 'danger' | 'warning'
export type AppDialogPresentation = 'card' | 'sheet' | 'fullscreen'

function toneColor(tone: AppDialogTone, accent: string, error: string): string {
  if (tone === 'danger') return error
  if (tone === 'warning') return '#f59e0b'
  return accent
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  icon,
  footer,
  tone = 'default',
  presentation = 'card',
  busy = false,
  dismissible = true,
  showClose = presentation !== 'fullscreen'
}: {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: string
  children: ReactNode
  icon?: AppIconName
  footer?: ReactNode
  tone?: AppDialogTone
  presentation?: AppDialogPresentation
  busy?: boolean
  dismissible?: boolean
  showClose?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const fullscreen = presentation === 'fullscreen'
  const sheet = presentation === 'sheet'
  const blockDismiss = busy || !dismissible
  const accent = toneColor(tone, theme.accent, theme.error)

  const requestClose = (): void => {
    if (blockDismiss) return
    onOpenChange(false)
  }

  return (
    <Modal
      visible={open}
      transparent={!fullscreen}
      statusBarTranslucent
      animationType={fullscreen ? 'slide' : 'fade'}
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: fullscreen ? 'flex-start' : sheet ? 'flex-end' : 'center'
        }}
      >
        {!fullscreen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть диалог"
            onPress={requestClose}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.64)'
            }}
          />
        ) : null}

        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            width: fullscreen ? '100%' : sheet ? '100%' : Math.max(280, Math.min(width - 32, 540)),
            height: fullscreen ? '100%' : sheet ? Math.min(height * 0.92, 820) : undefined,
            maxHeight: fullscreen ? undefined : Math.max(320, height * (sheet ? 0.92 : 0.85)),
            alignSelf: 'center',
            overflow: 'hidden',
            borderWidth: fullscreen ? 0 : 1,
            borderColor: tone === 'default' ? theme.border : accent + '38',
            borderTopLeftRadius: fullscreen ? 0 : sheet ? 28 : 22,
            borderTopRightRadius: fullscreen ? 0 : sheet ? 28 : 22,
            borderBottomLeftRadius: fullscreen || sheet ? 0 : 22,
            borderBottomRightRadius: fullscreen || sheet ? 0 : 22,
            backgroundColor: fullscreen ? theme.background : theme.raised,
            elevation: 18
          }}
        >
          <View
            style={{
              minHeight: 68,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: fullscreen ? 14 + insets.top : 14,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            {icon ? (
              <View
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: accent + '2E',
                  backgroundColor: accent + '14'
                }}
              >
                <AppIcon name={icon} size={20} color={accent} />
              </View>
            ) : null}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.text,
                  fontSize: 18,
                  lineHeight: 24,
                  fontWeight: '700'
                }}
              >
                {title}
              </Text>
              {description ? (
                <Text
                  style={{
                    marginTop: 2,
                    color: theme.muted,
                    fontSize: 12.5,
                    lineHeight: 18
                  }}
                >
                  {description}
                </Text>
              ) : null}
            </View>

            {busy ? <ActivityIndicator color={accent} /> : null}
            {showClose ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                disabled={busy}
                hitSlop={6}
                onPress={requestClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 11,
                  backgroundColor: pressed ? theme.surface : 'transparent',
                  opacity: busy ? 0.4 : pressed ? 0.72 : 1
                })}
              >
                <AppIcon name="close" size={18} color={theme.muted} />
              </Pressable>
            ) : null}
          </View>

          <View
            style={{
              minHeight: 0,
              flex: fullscreen || sheet ? 1 : undefined,
              paddingBottom: !footer && (fullscreen || sheet) ? insets.bottom : 0
            }}
          >
            {children}
          </View>

          {footer && !fullscreen ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 8,
                paddingHorizontal: 14,
                paddingTop: 14,
                paddingBottom: 14 + (fullscreen || sheet ? insets.bottom : 0),
                borderTopWidth: 1,
                borderTopColor: theme.border
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
