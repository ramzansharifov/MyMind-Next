# Архитектура MyMind

MyMind — локальное Electron-приложение. Renderer построен на React, main process владеет SQLite и файловым хранилищем, а preload публикует узкий типизированный IPC API.

## Границы процессов

- `src/main` — создание окна, миграции, репозитории, файловые операции и политики безопасности.
- `src/preload` — единственный мост renderer → main.
- `src/renderer` — интерфейс и локальное состояние редактирования.
- `src/shared` — IPC-контракты, Zod-схемы и платформонезависимые утилиты.

Electron BrowserWindow использует:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- `sandbox: true`.

Renderer не получает прямой доступ к Node.js или `ipcRenderer`.

## IPC

Preload публикует типизированный `window.api`.

Main process:

1. принимает payload;
2. проверяет доверенный sender там, где это необходимо;
3. валидирует данные через Zod;
4. вызывает repository или service;
5. возвращает сериализуемый результат.

Обычные IPC handlers выполняются через `MainOperationTracker`.

Shutdown response IPC не проходит через tracker, иначе renderer не смог бы подтвердить завершение после блокировки новых операций.

## Данные и сохранение

Материалы хранятся в SQLite как версионированные документы.

Renderer последовательно ставит autosave в очередь. Main process дополнительно сериализует сохранение, импорт, удаление и дублирование по material ID.

После транзакции cleanup получает фактически сохранённый документ. Старый save не может удалить файл, используемый новой подтверждённой версией документа.

SQLite использует:

- WAL;
- foreign keys;
- `busy_timeout`;
- синхронные транзакции `better-sqlite3`.

Миграции Drizzle запускаются до показа рабочего окна.

## MainOperationTracker

`MainOperationTracker`:

- считает активные IPC-операции;
- позволяет дождаться состояния idle;
- запрещает новые операции во время финальной стадии shutdown;
- снова разрешает операции, если пользователь отменяет закрытие.

Операция считается активной до завершения возвращённого Promise, включая файловое копирование и cleanup.

## Autosave и навигация

Каждый `StudyMaterialEditor` создаёт отдельную `StudyAutosaveQueue`, привязанную к неизменяемому `materialId`.

Смена материала или верхнеуровневого модуля сначала выполняет flush активного dirty draft.

При ошибке:

- текущий редактор остаётся смонтированным;
- черновик остаётся в памяти;
- пользователь может повторить сохранение;
- пользователь может остаться;
- потеря изменений требует отдельного подтверждения.

## Завершение приложения

Main process перехватывает:

- закрытие BrowserWindow;
- `before-quit`;
- `query-session-end`.

Последовательность обычного завершения:

1. main создаёт UUID shutdown request;
2. request отправляется renderer;
3. renderer выполняет flush активного draft;
4. renderer отвечает `success`, `failed`, `cancel` или `force`;
5. после `success` main запрещает новые обычные IPC-операции;
6. main ожидает завершения уже начатых операций;
7. SQLite закрывается;
8. окно уничтожается;
9. приложение завершается.

Ответ shutdown принимается только:

- от текущего доверенного `WebContents`;
- из main frame;
- после Zod-валидации request ID и decision.

Ожидание renderer и ожидание операций имеют отдельные timeout.

Native fallback используется, когда:

- renderer не ответил;
- renderer стал `unresponsive`;
- renderer process завершился;
- операции выполняются дольше допустимого времени.

Пользователь может:

- подождать;
- отменить закрытие;
- закрыть приложение принудительно.

При выборе «Подождать ещё» main повторно отправляет тот же shutdown request renderer и запускает новый timeout.

При отмене tracker снова принимает новые операции.

## Локальные ресурсы

SQLite хранится в:

```text
Electron userData/data/mymind.sqlite
```

Пользовательские вложения находятся в:

```text
Documents/MyMind/Attachments
```

Вложения выдаются через `mymind-asset://`.

URL канонизируется, ID и имена файлов валидируются, а разрешённый путь обязан оставаться внутри каталога соответствующего материала.

Протокол поддерживает:

- `GET`;
- `HEAD`;
- byte ranges.

После импорта main создаёт временную reservation:

```text
materialId + assetId + createdAt
```

Cleanup сохраняет:

- assets, используемые подтверждённым документом;
- assets с активной reservation.

Поэтому stale autosave не может удалить только что импортированный файл.

Reservation:

- снимается после успешного save со ссылкой на asset;
- удаляется вместе с материалом;
- истекает по TTL;
- не копируется при дублировании материала.

## Legacy plain text maintenance

После миграций выполняется versioned maintenance производного поля `plain_text`.

Maintenance:

- выбирает oversized legacy-значения;
- валидирует исходный документ;
- пересчитывает plain text;
- не меняет JSON документа;
- не логирует пользовательское содержимое;
- сохраняет версию выполнения в `app_meta`.

## Расширение приложения

Новый верхнеуровневый модуль добавляется в `app/module-registry.ts`.

Из ключей registry выводится `AppViewId`, поэтому навигация и lazy rendering используют один источник истины.

Новый study block требует:

- shared-контракт;
- Zod-схему;
- renderer registry entry;
- factory;
- edit strategy;
- read strategy;
- settings strategy;
- main plain-text extractor.

Exhaustive TypeScript mappings превращают отсутствие обязательной реализации в ошибку компиляции.
