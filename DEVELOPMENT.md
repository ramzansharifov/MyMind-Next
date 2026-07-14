# Разработка MyMind

## Требования

Для разработки нужны:

- Node.js 22;
- npm 10 или новее;
- Git;
- инструменты компиляции native-модулей;
- Windows, macOS или Linux.

На Windows обычно требуются Visual Studio Build Tools с компонентами C++.

## Первичная установка

```bash
npm ci
```

После установки `postinstall` подготавливает native-зависимости приложения.

## Запуск приложения

Development:

```bash
npm run dev
```

Production preview:

```bash
npm run start
```

Обе команды сначала выполняют `npm run native:electron`.

## Node.js и Electron ABI

`better-sqlite3` содержит native-бинарник.

Обычный Node.js и Electron могут использовать разные значения `NODE_MODULE_VERSION`, поэтому одна сборка `better_sqlite3.node` не всегда подходит обеим средам.

### Сборка для Node.js

Нужна для Vitest и repository integration tests:

```bash
npm run native:node
```

### Сборка для Electron

Нужна для приложения:

```bash
npm run native:electron
```

`npm run dev` и `npm run start` выполняют эту команду автоматически.

### Ошибка NODE_MODULE_VERSION

Ошибка вида:

```text
better_sqlite3.node was compiled against a different Node.js version
NODE_MODULE_VERSION 140
This version of Node.js requires NODE_MODULE_VERSION 127
```

означает несовпадение ABI.

Для тестов:

```bash
npm run native:node
```

Для приложения:

```bash
npm run dev
```

## Рекомендуемый цикл разработки

После изменения кода:

```bash
npm run format
npm run native:node
npm run test:run -- path/to/changed.test.ts
npm run check
git diff --check
```

`npm run check` самостоятельно выполняет `native:node`, поэтому отдельная команда перед полным check необязательна.

После проверки запусти приложение:

```bash
npm run dev
```

## Форматирование и lint

Форматирование:

```bash
npm run format
```

Проверка форматирования:

```bash
npm run format:check
```

Lint:

```bash
npm run lint
```

## TypeScript

Main и preload:

```bash
npm run typecheck:node
```

Renderer:

```bash
npm run typecheck:web
```

Полная проверка:

```bash
npm run typecheck
```

## Тестирование

Перед прямым запуском Vitest подготовь Node ABI:

```bash
npm run native:node
```

Все тесты:

```bash
npm run test:run
```

Один тестовый файл:

```bash
npm run test:run -- src/main/services/shutdown-coordinator.test.ts
```

Несколько файлов:

```bash
npm run test:run -- src/main/services/main-operation-tracker.test.ts src/main/services/shutdown-coordinator.test.ts
```

Coverage:

```bash
npm run test:coverage
```

Repository integration tests и migration tests используют временные SQLite-базы и не должны обращаться к пользовательской базе.

Некоторые `AppErrorBoundary` tests намеренно выбрасывают ошибки. Сообщения в `stderr` ожидаемы, когда сам тестовый файл завершился успешно.

## Полная проверка

```bash
npm run check
git diff --check
```

`npm run check` выполняет:

1. пересборку `better-sqlite3` для Node.js;
2. проверку форматирования;
3. ESLint;
4. оба TypeScript typecheck;
5. все тесты;
6. Drizzle schema check;
7. production bundle.

Coverage выполняется отдельно:

```bash
npm run native:node
npm run test:coverage
```

## База данных

Сгенерировать миграцию:

```bash
npm run db:generate
```

Проверить историю миграций:

```bash
npm run db:check
```

Применить миграции:

```bash
npm run db:migrate
```

`db:migrate` самостоятельно переключает ABI на Node.js, применяет миграции и возвращает native-модуль к Electron ABI.

Открыть Drizzle Studio:

```bash
npm run db:studio
```

После завершения Drizzle Studio перед запуском приложения используй:

```bash
npm run dev
```

Новые миграции проверяются:

- на чистой базе;
- на базе предыдущей версии;
- migration upgrade test;
- повторным запуском приложения.

## Сборка

Только production bundle:

```bash
npm run build:bundle
```

Распакованное приложение:

```bash
npm run build:unpack
```

Платформенные пакеты:

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

Публичный релиз требует code signing, а macOS также требует notarization.

## Shutdown и фоновые операции

При обычном закрытии приложение:

1. отправляет renderer запрос на сохранение активного черновика;
2. получает подтверждение успешного flush;
3. прекращает принимать новые обычные IPC-операции;
4. ждёт завершения уже запущенных импортов, сохранений, удалений и дублирований;
5. закрывает SQLite;
6. уничтожает окно;
7. завершает приложение.

Ожидание renderer и ожидание main-process операций имеют timeout.

Если renderer не отвечает или фоновая операция выполняется слишком долго, main process показывает native-диалог:

- подождать ещё;
- отменить закрытие;
- закрыть принудительно.

При выборе «Подождать ещё» shutdown request повторно отправляется renderer.

При отмене закрытия main process снова начинает принимать операции.

Принудительное закрытие может привести к потере несохранённого черновика или незавершённой файловой операции.

## Перед коммитом

```bash
npm run format
npm run native:node
npm run test:coverage
npm run check
git diff --check
git status --short
```

После проверки приложения:

```bash
npm run dev
```
