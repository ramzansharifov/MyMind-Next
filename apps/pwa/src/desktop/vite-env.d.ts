interface ImportMeta {
  env: { DEV: boolean }
}
declare module '@musclemap/assets/bodies/*.webp' {
  const source: string
  export default source
}
