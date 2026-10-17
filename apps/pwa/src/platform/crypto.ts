export const randomUUID = (): string => crypto.randomUUID()
export function getRandomValues<T extends Uint8Array>(array: T): T {
  crypto.getRandomValues(new Uint8Array(array.buffer, array.byteOffset, array.byteLength))
  return array
}
