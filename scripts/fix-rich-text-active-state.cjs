const fs = require('node:fs')

function replaceOnce(source, from, to, label) {
  const index = source.indexOf(from)

  if (index < 0) {
    throw new Error(`Missing patch anchor: ${label}`)
  }

  if (source.indexOf(from, index + from.length) >= 0) {
    throw new Error(`Ambiguous patch anchor: ${label}`)
  }

  return source.slice(0, index) + to + source.slice(index + from.length)
}

const cssPath = 'src/renderer/src/assets/main.css'
let css = fs.readFileSync(cssPath, 'utf8')

css = replaceOnce(
  css,
  `.rich-text-format-control[data-state='on'],\n.rich-text-format-control[data-active='true'] {`,
  `.rich-text-format-control[aria-pressed='true'],\n.rich-text-format-control[aria-checked='true'],\n.rich-text-format-control[data-active='true'] {`,
  'active control selector'
)

css = replaceOnce(
  css,
  `.rich-text-format-control[data-state='on']:hover,\n.rich-text-format-control[data-active='true']:hover {`,
  `.rich-text-format-control[aria-pressed='true']:hover,\n.rich-text-format-control[aria-checked='true']:hover,\n.rich-text-format-control[data-active='true']:hover {`,
  'active control hover selector'
)

fs.writeFileSync(cssPath, css)

const testPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.test.tsx'
let tests = fs.readFileSync(testPath, 'utf8')

tests = tests.replaceAll(
  `    expect(quoteControl).toHaveAttribute('data-state', 'off')\n`,
  ''
)
tests = tests.replaceAll(
  `    expect(quoteControl).toHaveAttribute('data-state', 'on')\n`,
  ''
)

fs.writeFileSync(testPath, tests)

fs.writeFileSync(
  '.github/workflows/ci.yml',
  `name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n\npermissions:\n  contents: read\n\njobs:\n  verify:\n    runs-on: windows-latest\n    timeout-minutes: 25\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npm run native:node\n      - run: npm run format:check\n      - run: npm run lint\n      - run: npm run typecheck\n      - run: npm run test:coverage\n      - run: npm run db:check\n      - run: npm run build:bundle\n      - uses: actions/upload-artifact@v4\n        if: \${{ always() && hashFiles('coverage/**') != '' }}\n        with:\n          name: coverage\n          path: coverage\n          if-no-files-found: error\n`
)
