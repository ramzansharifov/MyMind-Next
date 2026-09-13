export const MOBILE_DOM_VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, viewport-fit=cover'

export function DomViewportMeta(): React.JSX.Element {
  return <meta name="viewport" content={MOBILE_DOM_VIEWPORT_CONTENT} />
}
