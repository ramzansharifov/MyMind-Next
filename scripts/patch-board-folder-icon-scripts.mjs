import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/add-board-folder-icons.mjs'
let content = readFileSync(path, 'utf8')

const ambiguous = `replaceOnce(boardRepositoryPath, \`        title: 'Обучение',\\n        position:\`, \`        title: 'Обучение',\\n        icon: 'folder',\\n        position:\`)\nreplaceOnce(boardRepositoryPath, \`        title: 'Обучение',\\n        position: 0,\\n        isSystem: true,\`, \`        title: 'Обучение',\\n        icon: 'folder',\\n        position: 0,\\n        isSystem: true,\`)`

const precise = `replaceOnce(\n  boardRepositoryPath,\n  \`        parentId: null,\\n        title: 'Обучение',\\n        position: 0,\\n        isExpanded: true,\`,\n  \`        parentId: null,\\n        title: 'Обучение',\\n        icon: 'folder',\\n        position: 0,\\n        isExpanded: true,\`\n)\nreplaceOnce(\n  boardRepositoryPath,\n  \`        type: 'folder',\\n        parentId: null,\\n        title: 'Обучение',\\n        position: 0,\\n        isSystem: true,\`,\n  \`        type: 'folder',\\n        parentId: null,\\n        title: 'Обучение',\\n        icon: 'folder',\\n        position: 0,\\n        isSystem: true,\`\n)`

if (!content.includes(ambiguous)) {
  throw new Error('Ambiguous system root transformation was not found')
}

content = content.replace(ambiguous, precise)
writeFileSync(path, content, 'utf8')
console.log('Board icon transformation boundaries fixed')
