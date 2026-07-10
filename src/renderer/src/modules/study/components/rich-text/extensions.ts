import type { Extensions } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

export function createRichTextExtensions(readOnly: boolean): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
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

    TextAlign.configure({
      types: ['paragraph'],
      alignments: ['left', 'center', 'right', 'justify']
    }),

    TextStyleKit,

    Highlight.configure({
      multicolor: true
    }),

    Placeholder.configure({
      placeholder: 'Начни писать материал…',
      showOnlyWhenEditable: true
    })
  ]
}
