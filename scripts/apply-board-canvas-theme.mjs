import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) return

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function insertBeforeOnce(path, marker, inserted) {
  const content = read(path)

  if (content.includes(inserted.trim())) return

  const index = content.indexOf(marker)
  if (index < 0) {
    throw new Error(`Marker not found in ${path}: ${marker}`)
  }

  write(path, content.slice(0, index) + inserted + content.slice(index))
}

const boardCanvasPath = 'src/renderer/src/modules/boards/components/BoardCanvas.tsx'

replaceOnce(
  boardCanvasPath,
  `  useContext,\n  useEffect,\n  useMemo,\n  useRef,`,
  `  useContext,\n  useEffect,\n  useRef,`
)

replaceOnce(
  boardCanvasPath,
  `  const boardCanvasUi = useMemo<BoardCanvasUiContextValue>(\n    () => ({\n      isFullscreen,\n      fullscreenLabel,\n      toggleFullscreen\n    }),\n    [fullscreenLabel, isFullscreen, toggleFullscreen]\n  )`,
  `  const boardCanvasUi: BoardCanvasUiContextValue = {\n    isFullscreen,\n    fullscreenLabel,\n    toggleFullscreen\n  }`
)

const mainCssPath = 'src/renderer/src/assets/main.css'

insertBeforeOnce(
  mainCssPath,
  `::selection {\n`,
  `.mymind-board-canvas .tl-container {\n  --tl-radius-2: 0.5rem;\n  --tl-radius-3: 0.75rem;\n  --tl-radius-4: 0.875rem;\n\n  --tl-color-background: var(--app-workspace);\n  --tl-color-grid: color-mix(in srgb, var(--app-muted) 46%, transparent);\n  --tl-color-selection-fill: color-mix(in srgb, var(--app-accent-500) 20%, transparent);\n  --tl-color-selection-stroke: var(--app-accent-500);\n\n  --tl-color-low: var(--app-surface);\n  --tl-color-low-border: var(--app-border);\n  --tl-color-muted-none: transparent;\n  --tl-color-muted-0: var(--app-overlay-faint);\n  --tl-color-muted-1: color-mix(in srgb, var(--app-text) 10%, transparent);\n  --tl-color-muted-2: var(--app-overlay-soft);\n  --tl-color-hint: color-mix(in srgb, var(--app-accent-500) 15%, transparent);\n  --tl-color-divider: var(--app-border);\n  --tl-color-panel: var(--app-surface-raised);\n  --tl-color-panel-contrast: var(--app-border-strong);\n  --tl-color-panel-overlay: color-mix(in srgb, var(--app-surface-raised) 88%, transparent);\n  --tl-color-panel-transparent: transparent;\n  --tl-color-selected: var(--app-accent-500);\n  --tl-color-selected-contrast: var(--app-accent-50);\n  --tl-color-focus: var(--app-accent-400);\n  --tl-color-tooltip: var(--app-tooltip);\n\n  --tl-color-text: var(--app-text);\n  --tl-color-text-0: var(--app-text);\n  --tl-color-text-1: color-mix(in srgb, var(--app-text) 88%, var(--app-muted));\n  --tl-color-text-3: var(--app-muted);\n  --tl-color-text-disabled: color-mix(in srgb, var(--app-muted) 68%, transparent);\n  --tl-color-primary: var(--app-accent-500);\n\n  --tl-shadow-1: 0 1px 2px rgb(0 0 0 / 20%), inset 0 0 0 1px var(--app-border);\n  --tl-shadow-2: 0 8px 24px rgb(0 0 0 / 20%), inset 0 0 0 1px var(--app-border);\n  --tl-shadow-3: 0 12px 36px rgb(0 0 0 / 28%), inset 0 0 0 1px var(--app-border);\n  --tl-shadow-4: 0 18px 48px rgb(0 0 0 / 32%), inset 0 0 0 1px var(--app-border);\n}\n\n.mymind-board-canvas .tlui-menu,\n.mymind-board-canvas .tlui-popover__content {\n  border: 1px solid var(--app-border);\n}\n\n.mymind-board-canvas .tlui-menu-zone {\n  background-color: var(--app-surface);\n  border-color: var(--app-workspace);\n}\n\n.mymind-board-canvas .tlui-button__tool[aria-pressed='true'] {\n  color: var(--app-accent-50);\n}\n\n.mymind-board-canvas .tlui-button__tool[aria-pressed='true']::after {\n  background: var(--app-accent-500);\n}\n\n`
)

const instructionsPath =
  'src/renderer/src/modules/settings/instructions/boards-instruction-catalog.ts'

replaceOnce(
  instructionsPath,
  `          'Кнопка в правом верхнем углу холста разворачивает доску поверх основной навигации и дерева досок. Холст получает всё доступное пространство окна MyMind.'`,
  `          'Кнопка полноэкранного режима находится в верхнем блоке быстрых действий рядом с отменой, повтором, удалением и копированием. Она разворачивает холст поверх основной навигации и дерева досок.'`
)

insertBeforeOnce(
  instructionsPath,
  `      {\n        title: 'Заголовок доски',`,
  `      {\n        title: 'Оформление интерфейса',\n        paragraphs: [\n          'Панели инструментов, меню и всплывающие настройки холста используют те же поверхности, границы и тени, что и остальной интерфейс MyMind.'\n        ],\n        bullets: [\n          'Выбранный инструмент, фокус, выделение объектов и активные элементы используют акцентный цвет пользователя.',\n          'Светлая и тёмная темы автоматически обновляют фон холста, панели и текст.',\n          'Смена темы или акцента не пересоздаёт редактор и не сбрасывает содержимое доски.'\n        ]\n      },\n`
)

console.log('Board canvas theme bridge applied')
