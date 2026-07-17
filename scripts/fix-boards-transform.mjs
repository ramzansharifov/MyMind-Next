import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/apply-boards-module.mjs'
let content = readFileSync(path, 'utf8')

content = content.replace('\n\n  type EditableBlockProps =`,', '\n\ntype EditableBlockProps =`,')
content = content.replace('\n\n  type StudyBlockReaderProps = { block: StudyBlock }`,', '\n\ntype StudyBlockReaderProps = { block: StudyBlock }`,')

content = content.replace(
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  '        void flushActiveStudyDraft()\\n',\n  '        void flushActiveDrafts()\\n'\n)`,
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  \`        void flushActiveStudyDraft()\n          .then(async () => {\`,\n  \`        void flushActiveDrafts()\n          .then(async () => {\`\n)`
)

content = content.replace(
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  '                    void flushActiveStudyDraft()\\n',\n  '                    void flushActiveDrafts()\\n'\n)`,
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  \`                    void flushActiveStudyDraft()\n                      .then(async () => {\`,\n  \`                    void flushActiveDrafts()\n                      .then(async () => {\`\n)`
)

writeFileSync(path, content, 'utf8')
