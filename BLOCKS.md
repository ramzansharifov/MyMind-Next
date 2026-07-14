# Блоки редактора MyMind

## Единый registry

Метаданные каждого типа блока определяются только в:

```text
src/renderer/src/modules/study/lib/study-block-registry.ts
```

Definition содержит:

- `type`;
- пользовательское `label`;
- компонент `icon`;
- `factory`;
- `editStrategy`;
- `readStrategy`;
- `settingsStrategy`.

Компоненты редактора не должны создавать собственные mappings названий и иконок блоков.

Правильно:

```ts
const definition = getStudyBlockDefinition(block.type)
const BlockIcon = definition.icon
```

```tsx
<BlockIcon aria-hidden="true" />
<span>{definition.label}</span>
```

Неправильно:

```ts
if (block.type === 'code') {
  return 'Код'
}
```

```ts
const icons = {
  code: Code2,
  image: FileImage
}
```

Контекстные подписи, которые не являются названием типа блока, могут оставаться рядом с компонентом. Например:

- «Фотография с компьютера»;
- «Ссылка на YouTube»;
- «Высота фотографии».

## Добавление нового блока

При добавлении нового `StudyBlockType` необходимо:

1. Добавить shared-контракт блока.
2. Добавить Zod-валидацию.
3. Добавить definition в `studyBlockRegistry`.
4. Добавить factory с переданным `id`.
5. Добавить edit strategy.
6. Добавить read strategy.
7. Добавить settings strategy.
8. Добавить main-process plain-text extractor.
9. Добавить тесты создания, редактирования, чтения и сериализации.
10. Обновить ожидаемый список типов в `study-block-registry.test.ts`.

Registry обязан оставаться exhaustive. TypeScript должен выдавать ошибку, когда для нового типа отсутствует definition или одна из обязательных стратегий.

## Settings panel

`BlockSettingsPanel` получает из registry:

- название заголовка;
- иконку заголовка;
- settings strategy;
- иконку локального вложения.

Панель не содержит собственных `BlockTypeIcon`, `getBlockTitle` или attachment icon mapping.

`settingsRenderers` отвечает только за связывание settings strategy с React renderer. Он не хранит пользовательские названия или иконки.

## Clipboard

Весь renderer-код копирует текст через:

```text
src/renderer/src/shared/lib/write-clipboard.ts
```

Прямые вызовы `navigator.clipboard.writeText` в компонентах не используются.

Алгоритм helper:

1. Пытается вызвать async Clipboard API.
2. При успехе завершает операцию.
3. При отсутствии API запускает DOM fallback.
4. При rejected `writeText` также запускает DOM fallback.
5. Создаёт временный скрытый `textarea`.
6. Выполняет `document.execCommand('copy')`.
7. Всегда удаляет временный элемент.
8. Восстанавливает активный элемент.
9. Восстанавливает selection input или textarea.
10. Восстанавливает document selection ranges.

Ошибка возвращается только тогда, когда не сработали оба механизма.

## Проверка

Registry и clipboard:

```bash
npm run typecheck:web
npm run test:run -- src/renderer/src/modules/study/lib/study-block-registry.test.ts src/renderer/src/shared/lib/write-clipboard.test.ts
```

Связанные component tests:

```bash
npm run test:run -- src/renderer/src/modules/study/components/code/StudyCodeBlock.test.tsx src/renderer/src/modules/study/components/file/StudyFileBlockView.test.tsx
```

Полная проверка:

```bash
npm run check
git diff --check
```

После Node.js-тестов приложение запускается так:

```bash
npm run dev
```
