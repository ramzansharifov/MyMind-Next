import { mergeAttributes, Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { FileText, Heading, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { StudyInternalLinkTarget } from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { studyClient } from '../../api/study-client'
import {
  dispatchStudyInternalLinkNavigation,
  STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT,
  type StudyInternalLinkNavigateDetail
} from '../../lib/study-internal-link'

interface StudyInternalLinkAttributes {
  targetKind: 'material' | 'heading'
  materialId: string
  headingId: string | null
  headingLevel: 1 | 2 | 3 | null
  labelMode: 'auto' | 'custom'
  label: string
  materialTitle: string
  folderPath: string[]
}

export const StudyInternalLinkExtension = Node.create({
  name: 'studyInternalLink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      targetKind: {
        default: 'material',
        parseHTML: (element) =>
          element.getAttribute('data-target-kind') === 'heading' ? 'heading' : 'material',
        renderHTML: (attributes) => ({
          'data-target-kind': attributes.targetKind
        })
      },
      materialId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-material-id') ?? '',
        renderHTML: (attributes) => ({
          'data-material-id': attributes.materialId
        })
      },
      headingId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-heading-id'),
        renderHTML: (attributes) =>
          attributes.headingId
            ? {
                'data-heading-id': attributes.headingId
              }
            : {}
      },
      headingLevel: {
        default: null,
        parseHTML: (element) => {
          const level = Number(element.getAttribute('data-heading-level'))

          return level === 1 || level === 2 || level === 3 ? level : null
        },
        renderHTML: (attributes) =>
          attributes.headingLevel
            ? {
                'data-heading-level': String(attributes.headingLevel)
              }
            : {}
      },
      labelMode: {
        default: 'auto',
        parseHTML: (element) =>
          element.getAttribute('data-label-mode') === 'custom' ? 'custom' : 'auto',
        renderHTML: (attributes) => ({
          'data-label-mode': attributes.labelMode
        })
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent ?? '',
        renderHTML: (attributes) => ({
          'data-label': attributes.label
        })
      },
      materialTitle: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-material-title') ?? '',
        renderHTML: (attributes) => ({
          'data-material-title': attributes.materialTitle
        })
      },
      folderPath: {
        default: [],
        parseHTML: (element) => parseFolderPath(element.getAttribute('data-folder-path')),
        renderHTML: (attributes) => ({
          'data-folder-path': JSON.stringify(
            Array.isArray(attributes.folderPath) ? attributes.folderPath : []
          )
        })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-study-internal-link="true"]'
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-study-internal-link': 'true'
      }),
      String(node.attrs.label || 'Внутренняя ссылка')
    ]
  },

  renderText({ node }) {
    return String(node.attrs.label ?? '')
  },

  addNodeView() {
    return ReactNodeViewRenderer(StudyInternalLinkNodeView)
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-k': () => {
        if (!this.editor.isEditable) {
          return false
        }

        this.editor.view.dom.dispatchEvent(new CustomEvent(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT))

        return true
      }
    }
  }
})

function StudyInternalLinkNodeView({ node, editor, getPos }: NodeViewProps): React.JSX.Element {
  const attributes = normalizeInternalLinkAttributes(node.attrs)

  const [resolvedTarget, setResolvedTarget] = useState<StudyInternalLinkTarget | null | undefined>(
    undefined
  )

  useEffect(() => {
    let active = true

    studyClient
      .resolveInternalLinkTarget({
        kind: attributes.targetKind,
        materialId: attributes.materialId,
        headingId: attributes.headingId
      })
      .then((target) => {
        if (active) {
          setResolvedTarget(target)
        }
      })
      .catch(() => {
        if (active) {
          setResolvedTarget(undefined)
        }
      })

    return () => {
      active = false
    }
  }, [attributes.headingId, attributes.materialId, attributes.targetKind])

  const isMissing = resolvedTarget === null

  const displayLabel =
    attributes.labelMode === 'custom'
      ? attributes.label
      : (resolvedTarget?.title ?? attributes.label)

  const targetKind = resolvedTarget?.kind ?? attributes.targetKind

  const folderPath = resolvedTarget?.folderPath ?? attributes.folderPath

  const materialTitle = resolvedTarget?.materialTitle ?? attributes.materialTitle

  const location = [...folderPath, materialTitle].filter(Boolean).join(' / ')

  const tooltipTitle = isMissing
    ? 'Цель внутренней ссылки удалена'
    : displayLabel || 'Внутренняя ссылка'

  const tooltipAction = isMissing
    ? 'Цель больше не существует'
    : editor.isEditable
      ? 'Клик — открыть · Shift+клик — выбрать'
      : 'Клик — открыть'

  function selectLinkNode(): void {
    const position = getPos()

    if (typeof position === 'number') {
      editor.commands.setNodeSelection(position)
    }
  }

  function navigate(element: HTMLElement): void {
    const position = getPos()
    const detail: StudyInternalLinkNavigateDetail = {
      kind: attributes.targetKind,
      materialId: attributes.materialId,
      headingId: attributes.headingId,
      sourcePosition: typeof position === 'number' ? position : undefined,
      sourceBlockId: element.closest<HTMLElement>('[data-study-block-id]')?.dataset.studyBlockId
    }

    dispatchStudyInternalLinkNavigation(detail, resolvedTarget)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLSpanElement>): void {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (editor.isEditable && event.shiftKey) {
      selectLinkNode()
      return
    }

    navigate(event.currentTarget)
  }

  return (
    <Tooltip
      side="top"
      align="center"
      delayDuration={350}
      contentClassName="max-w-80 px-3 py-2"
      content={
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-semibold text-[var(--app-text)]">{tooltipTitle}</span>

          {!isMissing && location && (
            <span className="truncate text-[11px] font-normal text-[var(--app-muted)]">
              {location}
            </span>
          )}

          <span
            className={cn(
              'text-[10px] font-normal',
              isMissing ? 'text-red-300' : 'text-violet-300'
            )}
          >
            {tooltipAction}
          </span>
        </span>
      }
    >
      <NodeViewWrapper
        as="span"
        role="link"
        tabIndex={0}
        aria-label={
          isMissing
            ? `Недоступная внутренняя ссылка: ${displayLabel || 'без названия'}`
            : `Открыть внутреннюю ссылку: ${displayLabel || 'без названия'}`
        }
        aria-disabled={isMissing ? true : undefined}
        contentEditable={false}
        data-study-internal-link="true"
        data-target-kind={attributes.targetKind}
        data-material-id={attributes.materialId}
        data-heading-id={attributes.headingId ?? undefined}
        data-missing={isMissing ? 'true' : 'false'}
        data-study-internal-link-position={getPos()}
        className={cn('study-internal-link-node', isMissing && 'study-internal-link-node--missing')}
        onPointerDown={handlePointerDown}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return
          }

          event.preventDefault()
          event.stopPropagation()

          if (editor.isEditable && event.shiftKey) {
            selectLinkNode()
            return
          }

          navigate(event.currentTarget)
        }}
      >
        {targetKind === 'heading' ? (
          <Heading aria-hidden="true" className="size-3.5 shrink-0" />
        ) : (
          <FileText aria-hidden="true" className="size-3.5 shrink-0" />
        )}

        <span className="truncate">{displayLabel || 'Внутренняя ссылка'}</span>

        {isMissing && <Link2 aria-hidden="true" className="size-3 shrink-0" />}
      </NodeViewWrapper>
    </Tooltip>
  )
}

function normalizeInternalLinkAttributes(
  value: Record<string, unknown>
): StudyInternalLinkAttributes {
  const headingLevel =
    value.headingLevel === 1 || value.headingLevel === 2 || value.headingLevel === 3
      ? value.headingLevel
      : null

  return {
    targetKind: value.targetKind === 'heading' ? 'heading' : 'material',
    materialId: typeof value.materialId === 'string' ? value.materialId : '',
    headingId: typeof value.headingId === 'string' ? value.headingId : null,
    headingLevel,
    labelMode: value.labelMode === 'custom' ? 'custom' : 'auto',
    label: typeof value.label === 'string' ? value.label : '',
    materialTitle: typeof value.materialTitle === 'string' ? value.materialTitle : '',
    folderPath: Array.isArray(value.folderPath)
      ? value.folderPath.filter((item): item is string => typeof item === 'string')
      : []
  }
}

function parseFolderPath(value: string | null): string[] {
  if (!value) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(value)

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}
