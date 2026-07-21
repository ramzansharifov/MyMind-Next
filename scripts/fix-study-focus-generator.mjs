import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/add-study-focus-mode.mjs'
const source = readFileSync(path, 'utf8')
const generatedEffect = `  useEffect(() => {\\n    if (focusMode) {\\n      setMode('read')\\n    }\\n  }, [focusMode])\\n\\n`

if (!source.includes(generatedEffect)) {
  throw new Error('Focus mode synchronization effect was not found in the generator')
}

writeFileSync(path, source.replace(generatedEffect, ''), 'utf8')
console.log('Removed unnecessary focus mode state synchronization effect')
