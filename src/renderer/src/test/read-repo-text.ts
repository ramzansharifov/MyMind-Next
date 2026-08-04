import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Reads a repository text fixture without relying on import.meta.url.
 * Vite may rewrite import.meta.url to a non-file URL in renderer tests,
 * especially on Windows, while Vitest always starts from the repository root.
 */
export function readRepoText(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}
