import { createContext, useContext } from 'react'
import type { ClientServices } from './services'
export const ServicesContext = createContext<ClientServices | null>(null)
export function useServices(): ClientServices {
  const value = useContext(ServicesContext)
  if (!value) throw new Error('Хранилище ещё не открыто')
  return value
}
