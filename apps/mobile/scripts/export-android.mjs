import { spawnSync } from 'node:child_process'

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(command, ['expo', 'export', '--platform', 'android'], {
  env: {
    ...process.env,
    EXPO_NO_BUNDLE_SPLITTING: '1'
  },
  stdio: 'inherit'
})

if (result.error) throw result.error
if (result.signal) process.kill(process.pid, result.signal)
process.exit(result.status ?? 1)
