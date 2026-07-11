import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { StudyInternalLinkTarget } from '../../../../../../shared/contracts/study'
import { studyClient } from '../../api/study-client'
import { STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT } from '../../lib/study-internal-link'
import { createRichTextExtensions } from './extensions'
import {
  StudyInternalLinkPicker,
  type StudyInternalLinkPickerState
} from './StudyInternalLinkPicker'

interface RichTextBlockEditorProps {
  materialId: string
  html: string
  onChange: (html: string, plainText: string) => void
  onActivate: (editor: Editor) => void
  onReady: (editor: Editor) => void
  onDispose?: (editor: Editor) => void
}

interface WikiLinkTrigger {
  from: number
  to: number
  query: string
}

export function RichTextBlockEditor({
  materialId,
  html,
  onChange,
  onActivate,
  onReady,
  onDispose
}: RichTextBlockEditorProps): React.JSX.Element {
  const editorInstanceRef = useRef<Editor | null>(null)

  const onChangeRef = useRef(onChange)

  const onActivateRef = useRef(onActivate)

  const onReadyRef = useRef(onReady)

  const onDisposeRef = useRef(onDispose)

  const [pickerState, setPickerState] = useState<StudyInternalLinkPickerState | null>(null)

  const [targets, setTargets] = useState<StudyInternalLinkTarget[]>([])

  const [isSearching, setIsSearching] = useState(false)

  const pickerStateRef = useRef(pickerState)

  const targetsRef = useRef(targets)

  useEffect(() => {
    pickerStateRef.current = pickerState
  }, [pickerState])

  useEffect(() => {
    targetsRef.current = targets
  }, [targets])

  const selectInternalLinkTarget =
    useCallback(
      (
        target:
          StudyInternalLinkTarget,
        current =
          pickerStateRef.current,
        currentEditor =
          editorInstanceRef.current
      ): void => {
        if (
          !currentEditor ||
          currentEditor.isDestroyed ||
          !current
        ) {
          return
        }

        const selectedLabel =
          current.selectedText.trim()

        const label =
          selectedLabel ||
          target.title

        const inserted =
          currentEditor
            .chain()
            .focus()
            .insertContentAt(
              {
                from: current.from,
                to: current.to
              },
              {
                type:
                  'studyInternalLink',
                attrs: {
                  targetKind:
                    target.kind,
                  materialId:
                    target.materialId,
                  headingId:
                    target.headingId,
                  headingLevel:
                    target.headingLevel,
                  labelMode:
                    selectedLabel
                      ? 'custom'
                      : 'auto',
                  label,
                  materialTitle:
                    target.materialTitle,
                  folderPath:
                    target.folderPath
                }
              },
              {
                updateSelection: true
              }
            )
            .run()

        if (!inserted) {
          return
        }

        setPickerState(null)
        setTargets([])
        setIsSearching(false)
      },
      []
    )

  function synchronizeTriggerPicker(currentEditor: Editor): void {
    const trigger = findWikiLinkTrigger(currentEditor)

    if (!trigger) {
      if (pickerStateRef.current?.mode === 'trigger') {
        setPickerState(null)
      }

      return
    }

    const position = getInternalLinkPickerPosition(currentEditor, trigger.to)

    setPickerState((current) => ({
      mode: 'trigger',
      from: trigger.from,
      to: trigger.to,
      query: trigger.query,
      selectedText: '',
      selectedIndex:
        current?.mode === 'trigger' && current.query === trigger.query ? current.selectedIndex : 0,
      ...position
    }))
  }

  const editor = useEditor({
    extensions: createRichTextExtensions(false),
    content: html,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,

    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor'
      },

      handleKeyDown: (_view, event) => {
        const current = pickerStateRef.current

        if (!current || current.mode !== 'trigger') {
          return false
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          setPickerState(null)
          return true
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault()

          setPickerState((state) =>
            state
              ? {
                  ...state,
                  selectedIndex:
                    targetsRef.current.length === 0
                      ? 0
                      : (state.selectedIndex + 1) % targetsRef.current.length
                }
              : state
          )

          return true
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()

          setPickerState((state) =>
            state
              ? {
                  ...state,
                  selectedIndex:
                    targetsRef.current.length === 0
                      ? 0
                      : (state.selectedIndex - 1 + targetsRef.current.length) %
                        targetsRef.current.length
                }
              : state
          )

          return true
        }

        if (event.key === 'Enter') {
          const target = targetsRef.current[current.selectedIndex]

          if (!target) {
            return true
          }

          event.preventDefault()
          selectInternalLinkTarget(target)

          return true
        }

        return false
      }
    },

    onCreate: ({ editor: createdEditor }) => {
      editorInstanceRef.current = createdEditor

      queueMicrotask(() => {
        if (!createdEditor.isDestroyed) {
          onReadyRef.current(createdEditor)
        }
      })
    },

    onFocus: ({ editor: focusedEditor }) => {
      queueMicrotask(() => {
        if (!focusedEditor.isDestroyed) {
          onActivateRef.current(focusedEditor)
        }
      })
    },

    onUpdate: ({ editor: updatedEditor }) => {
      synchronizeTriggerPicker(updatedEditor)

      const nextHtml = updatedEditor.getHTML()

      const nextPlainText = updatedEditor.getText({
        blockSeparator: '\n\n'
      })

      queueMicrotask(() => {
        if (updatedEditor.isDestroyed) {
          return
        }

        onChangeRef.current(nextHtml, nextPlainText)
      })
    },

    onDestroy: () => {
      const destroyedEditor = editorInstanceRef.current

      editorInstanceRef.current = null

      if (destroyedEditor) {
        onDisposeRef.current?.(destroyedEditor)
      }
    }
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    editorInstanceRef.current =
      editor

    return () => {
      if (
        editorInstanceRef.current ===
        editor
      ) {
        editorInstanceRef.current =
          null
      }
    }
  }, [editor])
  useEffect(() => {
    onChangeRef.current = onChange

    onActivateRef.current = onActivate

    onReadyRef.current = onReady

    onDisposeRef.current = onDispose
  }, [onActivate, onChange, onDispose, onReady])

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return
    }

    if (editor.getHTML() === html) {
      return
    }

    editor.commands.setContent(html, {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
  }, [editor, html])

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return
    }

    const editorElement = editor.view.dom

    function openToolbarPicker(): void {
      if (editor.isDestroyed) {
        return
      }

      const { from, to } = editor.state.selection

      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim()

      const position = getInternalLinkPickerPosition(editor, to)

      setTargets([])
      setIsSearching(true)

      setPickerState({
        mode: 'toolbar',
        from,
        to,
        query: selectedText.slice(0, 120),
        selectedText,
        selectedIndex: 0,
        ...position
      })
    }

    editorElement.addEventListener(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT, openToolbarPicker)

    return () => {
      editorElement.removeEventListener(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT, openToolbarPicker)
    }
  }, [editor])

  const pickerMode = pickerState?.mode ?? null

  const pickerQuery = pickerState?.query ?? ''

  const pickerOpen = pickerState !== null

  useEffect(() => {
    if (!pickerMode) {
      return
    }

    let active = true

    const timeout = window.setTimeout(
      () => {
        setIsSearching(true)

        studyClient
          .searchInternalLinkTargets({
            query: pickerQuery,
            currentMaterialId: materialId,
            limit: 40
          })
          .then((results) => {
            if (!active) {
              return
            }

            setTargets(results)

            setPickerState((current) =>
              current
                ? {
                    ...current,
                    selectedIndex: 0
                  }
                : current
            )
          })
          .catch(() => {
            if (active) {
              setTargets([])
            }
          })
          .finally(() => {
            if (active) {
              setIsSearching(false)
            }
          })
      },
      pickerMode === 'trigger' ? 80 : 0
    )

    return () => {
      active = false

      window.clearTimeout(timeout)
    }
  }, [materialId, pickerMode, pickerQuery])

  useEffect(() => {
    if (!editor || !pickerOpen) {
      return
    }

    function reposition(): void {
      setPickerState((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          ...getInternalLinkPickerPosition(editor, current.to)
        }
      })
    }

    window.addEventListener('resize', reposition)

    document.addEventListener('scroll', reposition, true)

    return () => {
      window.removeEventListener('resize', reposition)

      document.removeEventListener('scroll', reposition, true)
    }
  }, [editor, pickerOpen])

  if (!editor) {
    return <div className="min-h-7 animate-pulse rounded-lg bg-white/[0.025]" />
  }

  return (
    <>
      <EditorContent editor={editor} className="min-h-0" />

      {pickerState && (
        <StudyInternalLinkPicker
          state={pickerState}
          targets={targets}
          isLoading={isSearching}
          onQueryChange={(query) => {
            setPickerState((current) =>
              current
                ? {
                    ...current,
                    query,
                    selectedIndex: 0
                  }
                : current
            )
          }}
          onSelectedIndexChange={(selectedIndex) => {
            setPickerState((current) =>
              current
                ? {
                    ...current,
                    selectedIndex
                  }
                : current
            )
          }}
          onSelect={(target) => {
            selectInternalLinkTarget(
              target,
              pickerState,
              editor
            )
          }}
          onClose={() => {
            setPickerState(null)
            setTargets([])
            setIsSearching(false)

            editor.chain().focus().run()
          }}
        />
      )}
    </>
  )
}

interface RichTextViewerProps {
  html: string
  plainText: string
}

export function RichTextViewer({ html, plainText }: RichTextViewerProps): React.JSX.Element {
  const editor = useEditor({
    extensions: createRichTextExtensions(true),
    content: html,
    editable: false,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,

    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor mymind-rich-text-viewer'
      }
    }
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return
    }

    if (editor.getHTML() === html) {
      return
    }

    editor.commands.setContent(html, {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
  }, [editor, html])

  if (!plainText.trim()) {
    return <p className="text-sm text-(--app-muted)">Пустой текстовый блок</p>
  }

  if (!editor) {
    return <p className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-300">{plainText}</p>
  }

  return <EditorContent editor={editor} />
}

function findWikiLinkTrigger(editor: Editor): WikiLinkTrigger | null {
  const selection = editor.state.selection

  if (!selection.empty || editor.isActive('code')) {
    return null
  }

  const textBeforeCursor = selection.$from.parent.textBetween(
    0,
    selection.$from.parentOffset,
    undefined,
    '\ufffc'
  )

  const match = /\[\[([^[\]\n]*)$/.exec(textBeforeCursor)

  if (!match) {
    return null
  }

  return {
    from: selection.from - match[0].length,
    to: selection.from,
    query: match[1]
  }
}

function getInternalLinkPickerPosition(
  editor: Editor,
  position: number
): {
  left: number
  top: number
} {
  try {
    const coordinates = editor.view.coordsAtPos(position)

    const pickerWidth = 430
    const pickerHeight = 390
    const viewportPadding = 12

    const left = Math.max(
      viewportPadding,
      Math.min(coordinates.left, window.innerWidth - pickerWidth - viewportPadding)
    )

    const preferredTop = coordinates.bottom + 8

    const top =
      preferredTop + pickerHeight <= window.innerHeight - viewportPadding
        ? preferredTop
        : Math.max(viewportPadding, coordinates.top - pickerHeight - 8)

    return {
      left,
      top
    }
  } catch {
    return {
      left: 12,
      top: 80
    }
  }
}
