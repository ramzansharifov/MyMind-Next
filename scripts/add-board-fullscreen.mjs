import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

replaceOnce(
  'src/renderer/src/modules/settings/instructions/boards-instruction-catalog.ts',
  `      {\n        title: 'Автоматическое сохранение',`,
  `      {\n        title: 'Полноэкранный режим',\n        paragraphs: [\n          'Кнопка в правом верхнем углу холста разворачивает доску поверх основной навигации и дерева досок. Холст получает всё доступное пространство окна MyMind.'\n        ],\n        bullets: [\n          'Повторное нажатие возвращает исходную компоновку.',\n          'Клавиша Esc также завершает полноэкранный режим.',\n          'Переключение не пересоздаёт tldraw, поэтому выбранный инструмент, масштаб, история и несохранённые изменения сохраняются.',\n          'После выхода обе боковые панели возвращаются в том же состоянии, в котором находились до разворачивания доски.'\n        ]\n      },\n      {\n        title: 'Автоматическое сохранение',`
)

replaceOnce(
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx',
  `  it('navigates to and highlights a section from the contents list', async () => {`,
  `  it('documents fullscreen board controls and preserved canvas state', () => {\n    render(<BoardsInstructionArticlePage topicId="boards-canvas" onBack={vi.fn()} />)\n\n    expect(screen.getByRole('heading', { name: 'Полноэкранный режим' })).toBeInTheDocument()\n    expect(screen.getByText(/Клавиша Esc также завершает полноэкранный режим/)).toBeInTheDocument()\n    expect(screen.getByText(/не пересоздаёт tldraw/)).toBeInTheDocument()\n  })\n\n  it('navigates to and highlights a section from the contents list', async () => {`
)

console.log('Board fullscreen instructions applied')
