import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const child = spawn(
  process.execPath,
  [
    require.resolve('vitest/vitest.mjs'),
    'run',
    '--config',
    fileURLToPath(new URL('../vitest.config.ts', import.meta.url))
  ],
  {
    cwd: fileURLToPath(new URL('../../..', import.meta.url)),
    stdio: 'inherit',
    windowsHide: true
  }
)
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
