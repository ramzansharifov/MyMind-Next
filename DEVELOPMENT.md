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

Тесты autosave и lifecycle удаления:

```bash
npm run test:run -- src/renderer/src/modules/study/lib/study-autosave-queue.test.ts src/renderer/src/modules/study/lib/study-draft-lifecycle.test.ts src/renderer/src/modules/study/lib/study-material-transition.test.ts
```

Полный набор тестов безопасного удаления:

```bash
npm run test:run -- src/renderer/src/modules/study/lib/study-autosave-queue.test.ts src/renderer/src/modules/study/lib/study-draft-lifecycle.test.ts src/renderer/src/modules/study/lib/study-material-transition.test.ts src/renderer/src/modules/study/lib/study-tree.test.ts src/renderer/src/modules/study/hooks/use-study.test.tsx
```

Тест shutdown:

```bash
npm run test:run -- src/main/services/shutdown-coordinator.test.ts
```

Coverage:

```bash
npm run test:coverage
```

Repository integration tests и migration tests используют временные SQLite-базы и не должны обращаться к пользовательской базе.

Некоторые `AppErrorBoundary` tests намеренно выбрасывают ошибки. Сообщения в `stderr` ожидаемы, когда сам тестовый файл завершился успешно.

## Ручная проверка безопасного удаления

### Активный материал с pending debounce

1. Открой материал.
2. Измени текст.
3. Не жди 800 мс.
4. Сразу удали этот материал.
5. Подтверди удаление.
6. Проверь, что материал исчез.
7. Проверь консоль: после удаления не должно появиться нового autosave-запроса для удалённого material ID.

### Папка с активным материалом

1. Открой материал внутри вложенной папки.
2. Измени документ.
3. Удали родительскую папку через дерево.
4. Подтверди удаление.
5. Папка, материал и вложения должны исчезнуть без запоздалого save.

### Переход во время pending delete

1. Запусти удаление активного материала.
2. До завершения backend delete попробуй перейти в другой материал или модуль.
3. Переход не должен размонтировать редактор до завершения delete.
4. При успешном delete переход продолжается без сохранения удалённого draft.
5. При ошибке delete сначала выполняется rollback и сохранение восстановленного draft.

### Закрытие приложения во время pending delete

1. Запусти удаление активного материала.
2. Сразу закрой приложение.
3. Renderer shutdown flush должен дождаться commit или rollback удаления.
4. SQLite не должна закрываться до окончания tracked main-process delete.
5. При rollback save error закрытие должно быть отменено с сообщением об ошибке.

### Rollback после unmount

Автоматический тест проверяет, что `resume()` не может снова установить mounted-состояние очереди.

Ожидаемое поведение:

- фоновый save из уничтоженного редактора не запускается;
- React state callback размонтированного редактора не вызывается;
- draft остаётся несохранённым, пока очередь явно не смонтирована снова.

### Удаление во время активного save

1. Измени большой материал.
2. Сразу запусти удаление.
3. Main process должен последовательно завершить уже начатый save и затем delete.
4. Материал не должен восстановиться после удаления.

### Ошибка удаления

Для проверки требуется временно смоделировать ошибку `studyClient.deleteNode` либо backend repository.

Ожидаемое поведение:

- материал остаётся открытым;
- черновик остаётся в памяти;
- очередь выходит из deletion pause;
- последняя версия снова сохраняется, только если редактор смонтирован;
- ошибка отображается пользователю.

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

1. отправляет renderer запрос на flush активного черновика;
2. ожидает завершения pending delete, если он выполняется;
3. получает подтверждение успешного flush;
4. прекращает принимать новые обычные IPC-операции;
5. ждёт завершения уже запущенных импортов, сохранений, удалений и дублирований;
6. закрывает SQLite;
7. уничтожает окно;
8. завершает приложение.

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
