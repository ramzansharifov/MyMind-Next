import { Mark, type Extensions } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

import { StudyInternalLinkExtension } from './StudyInternalLinkExtension'

interface RichTextExtensionOptions {
  internalLinks?: boolean
  placeholder?: string
}

const FormattingStarterKit = StarterKit.extend({
  addExtensions() {
    return (this.parent?.() ?? []).map((extension) => {
      if (extension.name !== 'code' || !(extension instanceof Mark)) return extension
      // Inline code changes the font family without removing size, color,
      // highlighting, links, or other inline formatting.
      return extension.extend({ excludes: '' })
    })
  }
})

export function createRichTextExtensions(
  readOnly: boolean,
  { internalLinks = true, placeholder = 'Начни писать материал…' }: RichTextExtensionOptions = {}
): Extensions {
  return [
    FormattingStarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
      link: {
        autolink: true,
        linkOnPaste: true,
        openOnClick: readOnly,
        enableClickSelection: !readOnly,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }
    }),

    ...(internalLinks ? [StudyInternalLinkExtension] : []),

    TextAlign.configure({
      types: ['paragraph'],
      alignments: ['left', 'center', 'right', 'justify']
    }),

    TextStyleKit,

    Highlight.configure({
      multicolor: true
    }),

    Placeholder.configure({
      placeholder,
      showOnlyWhenEditable: true
    })
  ]
}
