# Shared cross-platform packages

`packages/*` contains code that is shared by the Desktop and PWA applications.

## Boundaries

- `@mymind/contracts` — platform-neutral ports and types. It must not import Electron, React DOM, React Native, Expo, SQLite implementations, or application UI.
- `@mymind/core` — pure business/application logic. It may depend on `@mymind/contracts`, but it must not depend on either app or on platform SDKs.
- `@mymind/design` — platform-neutral design tokens and semantic values. Platform components may map these tokens to Tailwind/CSS or React Native styles.
- `apps/desktop` — Electron adapters, desktop navigation and desktop UI.
- `apps/pwa` — browser adapters, phone navigation and React Native Web UI.
- `@mymind/persistence` — shared repositories and versioned database migrations; historical mobile schema names remain for data compatibility.

Dependencies always point inward: apps may import packages; packages never import from apps.

When a module is migrated, move its domain rules, validation, calculations and use-cases into `@mymind/core`, express OS/storage dependencies as contracts, and keep platform-specific adapters and presentation inside the corresponding app.
