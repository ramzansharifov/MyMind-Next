export function MovieModuleHeaderGlow(): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
      />
    </>
  )
}
