export interface SettingsBreadcrumbItem {
  label: string
  onClick?: () => void
}

export function SettingsBreadcrumbs({
  items
}: {
  items: SettingsBreadcrumbItem[]
}): React.JSX.Element {
  return (
    <nav aria-label="Навигация по настройкам" className="mb-4 min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-[var(--app-muted)]/45">
                  /
                </span>
              )}

              {isCurrent || !item.onClick ? (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className="min-w-0 break-words font-medium text-[var(--app-text)]"
                >
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  className="rounded-md text-[var(--app-muted)] outline-none transition-colors hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/45"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
