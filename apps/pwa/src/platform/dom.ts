export { useImperativeHandle as useDOMImperativeHandle } from 'react'

type JsonValue =
  boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue | undefined }

/** Commands exposed by the browser note editor through a React ref. */
export interface DOMImperativeFactory {
  [key: string]: (...args: JsonValue[]) => void
}
