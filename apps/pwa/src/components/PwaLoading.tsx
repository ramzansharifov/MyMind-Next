type PwaLoadingProps = {
  variant?: 'app' | 'module'
  message?: string
}

/** A lightweight browser-only fallback, safe to show before local SQLite is available. */
export function PwaLoading({ variant = 'app', message }: PwaLoadingProps): React.JSX.Element {
  const initial = variant === 'app'
  return (
    <div
      className={`pwa-loading pwa-loading--${variant}`}
      role="status"
      aria-live="polite"
      aria-label={message ?? (initial ? 'Открываем MyMind' : 'Загрузка раздела')}
    >
      <div className="pwa-loading-inner">
        {initial ? (
          <div className="pwa-loading-brand">
            <span className="pwa-loading-logo" aria-hidden="true" />
            <span>MyMind</span>
          </div>
        ) : (
          <div className="pwa-loading-module-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
        <div className="pwa-loading-track" aria-hidden="true">
          <span />
        </div>
        <p className="pwa-loading-caption">
          {message ?? (initial ? 'Подготавливаем ваше пространство' : 'Открываем раздел')}
        </p>
        {!initial ? (
          <div className="pwa-loading-skeleton" aria-hidden="true">
            <span className="pwa-loading-skeleton-line" />
            <span className="pwa-loading-skeleton-card" />
            <span className="pwa-loading-skeleton-card" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
