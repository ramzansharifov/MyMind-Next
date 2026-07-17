import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/apply-boards-module.mjs'
let content = readFileSync(path, 'utf8')

content = content.replace(
  `replaceOnce(\n  'src/main/database/schema/index.ts',\n  "export { appMeta } from './app-meta'\\n",\n  "export { appMeta } from './app-meta'\\nexport { boardDocuments, boardNodes } from './boards'\\n"\n)`,
  `replaceOnce(\n  'src/main/database/schema/index.ts',\n  "export { studyLinkTargets, studyMaterials, studyNodes } from './study'\\n",\n  "export { boardDocuments, boardNodes } from './boards'\\nexport { studyLinkTargets, studyMaterials, studyNodes } from './study'\\n"\n)`
)

content = content.replace('\n\n  type EditableBlockProps =`,', '\n\ntype EditableBlockProps =`,')
content = content.replace(
  '\n\n  type StudyBlockReaderProps = { block: StudyBlock }`,',
  '\n\ntype StudyBlockReaderProps = { block: StudyBlock }`,'
)

content = content.replace(
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  '        void flushActiveStudyDraft()\\n',\n  '        void flushActiveDrafts()\\n'\n)`,
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  \`        void flushActiveStudyDraft()\n          .then(async () => {\`,\n  \`        void flushActiveDrafts()\n          .then(async () => {\`\n)`
)

content = content.replace(
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  '                    void flushActiveStudyDraft()\\n',\n  '                    void flushActiveDrafts()\\n'\n)`,
  `replaceOnce(\n  'src/renderer/src/App.tsx',\n  \`                    void flushActiveStudyDraft()\n                      .then(async () => {\`,\n  \`                    void flushActiveDrafts()\n                      .then(async () => {\`\n)`
)

writeFileSync(path, content, 'utf8')
