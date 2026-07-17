import { existsSync, rmSync } from 'node:fs'

await import('./finalize-boards-ui.mjs')

for (const path of [
  new URL('./finalize-boards-ui.mjs', import.meta.url),
  new URL('../.boards-ci-trigger', import.meta.url),
  new URL('../boards-verification.log', import.meta.url)
]) {
  if (existsSync(path)) {
    rmSync(path)
  }
}
