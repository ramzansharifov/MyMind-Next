import { createContext, useContext } from 'react'

export const RichTextInternalLinksContext = createContext(true)

export function useRichTextInternalLinksEnabled(): boolean {
  return useContext(RichTextInternalLinksContext)
}
