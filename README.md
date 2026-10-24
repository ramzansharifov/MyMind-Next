# MyMind

Локальное приложение с двумя версиями: **Desktop** (Electron + React) и **PWA** (Next.js + React, HTML/CSS). Пользовательские данные хранятся на устройстве, удалённой базы данных нет.

```text
apps/
  desktop/       # Desktop
  pwa/           # PWA для телефона и браузера
  music-bridge/  # Вспомогательный локальный сервис музыки Desktop
packages/        # Общие контракты, бизнес-логика, дизайн и persistence
```

Все команды запускаются из корня репозитория:

```bash
npm ci
npm run dev:desktop
# Или PWA:
npm run dev:pwa
```

`npm run dev` остаётся алиасом Desktop. Нативная сборка Android/iOS больше не поддерживается; используемый телефонный интерфейс перенесён внутрь PWA. Подробности совместимости данных и перехода — [PWA_MIGRATION.md](PWA_MIGRATION.md).

## PWA

Публичный адрес: https://mymind-pwa.vercel.app. Установка выполняется через браузер. SQLite WASM, IndexedDB, вложения, профиль и сейф работают локально. Офлайн-кэш доступен после первоначальной загрузки production-версии.

```bash
npm run build:pwa
npm run start:pwa
```

Сценарии установки, резервные копии и ограничения браузера описаны в [apps/pwa/README.md](apps/pwa/README.md).

## Desktop

MyMind — локальное desktop-приложение для структурированных учебных материалов.

Приложение поддерживает:

- дерево папок и материалов;
- блочный редактор;
- внутренние ссылки;
- изображения, аудио, видео и обычные файлы;
- YouTube;
- код;
- Markdown;
- LaTeX;
- Mermaid.

## Быстрый старт

Требования:

- Node.js 22;
- npm 10+;
- инструменты сборки native-модулей для используемой ОС.

```bash
npm ci
npm run dev
```

`npm run dev` автоматически пересобирает `better-sqlite3` для Electron.

## Проверка проекта

Полная локальная проверка:

```bash
npm run check
```

Команда автоматически пересобирает `better-sqlite3` для обычного Node.js, а затем запускает:

- проверку форматирования;
- ESLint;
- TypeScript;
- все тесты;
- проверку Drizzle;
- production bundle.

После `npm run check` приложение запускается обычной командой:

```bash
npm run dev
```

Она снова пересоберёт native-модуль для Electron.

Подробные инструкции находятся в [DEVELOPMENT.md](DEVELOPMENT.md).

## Документация

- [PWA_MIGRATION.md](PWA_MIGRATION.md) — переход на Desktop/PWA и совместимость прежних данных.
- [apps/pwa/PARITY.md](apps/pwa/PARITY.md) — состав, архитектура и границы проверки PWA.

- [DEVELOPMENT.md](DEVELOPMENT.md) — запуск, тестирование, native ABI, миграции и сборка.
- [ARCHITECTURE.md](ARCHITECTURE.md) — процессы Electron, IPC, autosave, shutdown и хранение.
- [BLOCKS.md](BLOCKS.md) — registry блоков, добавление новых типов и clipboard helper.
- [SECURITY.md](SECURITY.md) — модель угроз, CSP, permissions и резервное копирование.

## Сборка

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

Локальная сборка не означает, что пакет подписан или notarized. Требования к доверенному релизу описаны в `SECURITY.md`.
