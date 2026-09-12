import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import type { ResolveStudyInternalLinkTargetInput, StudyTextBlock } from '@mymind/contracts/study'

import NotesRichTextDom, {
  type NotesRichTextDomRef,
  type NotesRichTextFormattingState
} from './NotesRichTextDom'
import { useTheme } from './theme'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function initialHtml(block: StudyTextBlock): string {
  return block.html?.trim() ? block.html : `<p>${escapeHtml(block.text)}</p>`
}

const StableNotesRichTextDom = memo(NotesRichTextDom)

const noopChange = async (): Promise<void> => undefined
const noopFocus = async (): Promise<void> => undefined
const noopFormatting = async (): Promise<void> => undefined

export function DocumentRichTextViewer({
  html,
  onOpenInternalLink,
  onOpenExternalLink
}: {
  html: string
  onOpenInternalLink?: (target: ResolveStudyInternalLinkTargetInput) => void
  onOpenExternalLink?: (href: string) => void
}): React.JSX.Element {
  const theme = useTheme()
  const [height, setHeight] = useState(64)
  const initialHtmlRef = useRef(html || '<p></p>')

  const handleHeight = useCallback(async (nextHeight: number): Promise<void> => {
    const normalized = Math.max(32, Math.min(2400, Math.ceil(nextHeight)))
    setHeight((current) => (Math.abs(current - normalized) >= 2 ? normalized : current))
  }, [])

  const handleInternalLink = useCallback(
    async (target: ResolveStudyInternalLinkTargetInput): Promise<void> => {
      onOpenInternalLink?.(target)
    },
    [onOpenInternalLink]
  )

  const handleExternalLink = useCallback(
    async (href: string): Promise<void> => {
      onOpenExternalLink?.(href)
    },
    [onOpenExternalLink]
  )

  const dom = useMemo(
    () => ({
      scrollEnabled: false,
      style: { height: Math.max(32, height), backgroundColor: 'transparent' }
    }),
    [height]
  )

  return (
    <View style={{ minHeight: Math.max(32, height), overflow: 'hidden' }}>
      <StableNotesRichTextDom
        ref={null}
        html={initialHtmlRef.current}
        editable={false}
        textColor={theme.text}
        mutedColor={theme.muted}
        borderColor={theme.border}
        surfaceColor={theme.raised}
        accentColor={theme.accent}
        onChange={noopChange}
        onFocusEditor={noopFocus}
        onFormattingState={noopFormatting}
        onHeightChange={handleHeight}
        onOpenInternalLink={handleInternalLink}
        onOpenExternalLink={handleExternalLink}
        dom={dom}
      />
    </View>
  )
}

export function NotesRichTextBlock({
  block,
  active,
  registerRef,
  update,
  activate,
  formattingChanged
}: {
  block: StudyTextBlock
  active: boolean
  registerRef(ref: NotesRichTextDomRef | null): void
  update(block: StudyTextBlock): void
  activate(): void
  formattingChanged(state: NotesRichTextFormattingState): void
}): React.JSX.Element {
  const theme = useTheme()
  const [height, setHeight] = useState(92)
  const blockRef = useRef(block)
  const updateRef = useRef(update)
  const activateRef = useRef(activate)
  const formattingChangedRef = useRef(formattingChanged)
  const initialContentRef = useRef({
    html: initialHtml(block)
  })

  useEffect(() => {
    blockRef.current = block
    updateRef.current = update
    activateRef.current = activate
    formattingChangedRef.current = formattingChanged
  }, [activate, block, formattingChanged, update])

  const handleChange = useCallback(async (html: string, text: string): Promise<void> => {
    const current = blockRef.current
    if (html === current.html && text === current.text) return
    const next = { ...current, html, text }
    blockRef.current = next
    updateRef.current(next)
  }, [])

  const handleFocus = useCallback(async (): Promise<void> => {
    activateRef.current()
  }, [])

  const handleFormatting = useCallback(
    async (state: NotesRichTextFormattingState): Promise<void> => {
      formattingChangedRef.current(state)
    },
    []
  )

  const handleHeight = useCallback(async (nextHeight: number): Promise<void> => {
    const normalized = Math.max(72, Math.min(1600, Math.ceil(nextHeight)))
    setHeight((current) => (Math.abs(current - normalized) >= 2 ? normalized : current))
  }, [])

  const dom = useMemo(
    () => ({
      scrollEnabled: false,
      style: { height: Math.max(72, height), backgroundColor: 'transparent' }
    }),
    [height]
  )

  return (
    <View
      style={{
        minHeight: Math.max(72, height),
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: active ? theme.accent + '05' : 'transparent'
      }}
    >
      <StableNotesRichTextDom
        ref={registerRef}
        html={initialContentRef.current.html}
        textColor={theme.text}
        mutedColor={theme.muted}
        borderColor={theme.border}
        surfaceColor={theme.raised}
        accentColor={theme.accent}
        onChange={handleChange}
        onFocusEditor={handleFocus}
        onFormattingState={handleFormatting}
        onHeightChange={handleHeight}
        dom={dom}
      />
    </View>
  )
}
