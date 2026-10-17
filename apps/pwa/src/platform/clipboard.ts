export async function setStringAsync(value: string): Promise<boolean> {
  await navigator.clipboard.writeText(value)
  return true
}
export const getStringAsync = (): Promise<string> => navigator.clipboard.readText()
