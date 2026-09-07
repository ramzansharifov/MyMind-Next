const fs = require('node:fs')

function patch(path, replacements) {
  let value = fs.readFileSync(path, 'utf8')
  for (const [from, to] of replacements) {
    if (!value.includes(from)) throw new Error(`Patch target not found in ${path}: ${from.slice(0, 140)}`)
    value = value.replace(from, to)
  }
  fs.writeFileSync(path, value)
}

patch('apps/mobile/src/shared/ui/DocumentReader.tsx', [
  [
    "import { designTokens } from '@mymind/design'",
    "import { appearanceTokens, designTokens } from '@mymind/design'"
  ],
  [
    "import { Button, Label } from './primitives'\nimport { useTheme } from './theme'",
    "import { Button, Label } from './primitives'\nimport RichContentDom from './RichContentDom'\nimport { useTheme } from './theme'"
  ],
  [
    "  const theme = useTheme()\n\n  switch (block.type) {",
    "  const theme = useTheme()\n  const colorScheme = theme.background === appearanceTokens.dark.background ? 'dark' : 'light'\n  const richProps = {\n    colorScheme,\n    textColor: theme.text,\n    mutedColor: theme.muted,\n    borderColor: theme.border,\n    surfaceColor: theme.raised,\n    accentColor: theme.accent,\n    dom: { matchContents: true, scrollEnabled: false, style: { width: '100%' } }\n  } as const\n\n  switch (block.type) {"
  ],
  [
    "    case 'markdown':\n      return <SourceSurface label=\"Markdown\" source={block.source} />\n    case 'latex':\n      return <SourceSurface label=\"LaTeX\" source={block.source} />\n    case 'mermaid':\n      return <SourceSurface label=\"Mermaid\" source={block.source} />",
    "    case 'markdown':\n      return <RichContentDom {...richProps} kind=\"markdown\" source={block.source} />\n    case 'latex':\n      return (\n        <RichContentDom\n          {...richProps}\n          kind=\"latex\"\n          source={block.source}\n          latexDisplayMode={block.displayMode ?? 'display'}\n          latexAlignment={block.alignment ?? 'center'}\n          latexScale={block.scale ?? 1}\n        />\n      )\n    case 'mermaid':\n      return (\n        <RichContentDom\n          {...richProps}\n          kind=\"mermaid\"\n          source={block.source}\n          mermaidTheme={block.theme ?? (colorScheme === 'dark' ? 'dark' : 'default')}\n        />\n      )"
  ]
])

const parityPath = 'MOBILE_PARITY.md'
let parity = fs.readFileSync(parityPath, 'utf8')
parity = parity.replace(
  /^\| Study\s+\|.*$/m,
  '| Study | Nested folders/materials, versioned block documents, read/edit/focus, resource navigation, code workspace, links, assets, PDF, duplicate, reorder, autosave, deletion barriers | Shared contracts/V3 repository, native tree CRUD, lossless editor, serialized autosave, local attachments, read/focus modes, linked tldraw boards, and rendered GFM Markdown/KaTeX/Mermaid through an offline Expo DOM surface | Folder/material Code Workspace, PDF workflow, internal rich-text link navigation and final physical-device rich-render smoke tests |'
)
fs.writeFileSync(parityPath, parity)
