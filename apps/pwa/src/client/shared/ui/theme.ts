import { createContext, useContext } from 'react'
import { appearanceTokens } from '@mymind/design'
export type Palette = { [Key in keyof typeof appearanceTokens.dark]: string } & { accent: string }
export const ThemeContext = createContext<Palette>({
  ...appearanceTokens.dark,
  accent: appearanceTokens.accents.violet
})
export const useTheme = (): Palette => useContext(ThemeContext)
