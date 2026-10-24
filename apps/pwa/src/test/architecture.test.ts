import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
const root = fileURLToPath(new URL('../../../../', import.meta.url))
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory()
      ? sourceFiles(filename)
      : /\.(tsx?|mjs|js)$/.test(entry.name)
        ? [filename]
        : []
  })
}
describe('Desktop and PWA independence from retired native apps', () => {
  it('installs only Desktop and PWA without Expo or React Native packages', () => {
    const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
    const names = Object.keys(lock.packages)
    expect(names.filter((name) => /^apps\/[^/]+$/.test(name)).sort()).toEqual([
      'apps/desktop',
      'apps/pwa'
    ])
    expect(
      names.filter((name) =>
        /(?:^|\/)node_modules\/(?:expo(?:$|-)|@expo\/|react-native(?:$|-)|@react-native\/|lucide-react-native$)/.test(
          name
        )
      )
    ).toEqual([])
    expect(existsSync(path.join(root, 'apps/mobile'))).toBe(false)
  })
  it('keeps PWA source and build scripts free of native SDK imports and retired paths', () => {
    const files = ['apps/pwa/src', 'apps/pwa/scripts'].flatMap((directory) =>
      sourceFiles(path.join(root, directory))
    )
    files.push(path.join(root, 'apps/pwa/next.config.mjs'))
    for (const file of files.filter((name) => !name.endsWith('architecture.test.ts'))) {
      const source = readFileSync(file, 'utf8')
      expect(source, path.relative(root, file)).not.toMatch(
        /(?:from\s*|import\s*\(|require\s*\(|vi\.mock\s*\()['"](?:expo(?:[-/][^'"]*)?|react-native(?:[-/][^'"]*)?|lucide-react-native|[^'"]*mobile\/src[^'"]*)['"]|apps\/mobile/
      )
    }
  })
})
