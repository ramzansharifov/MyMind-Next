import { createContext, useContext } from 'react'
import type { MobileServices } from './services'
export const ServicesContext = createContext<MobileServices | null>(null)
export function useServices(): MobileServices {
  const value = useContext(ServicesContext)
  if (!value) throw new Error('Хранилище ещё не открыто')
  return value
}
