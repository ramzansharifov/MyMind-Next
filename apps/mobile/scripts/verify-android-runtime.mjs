import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const packageName = process.env.MYMIND_ANDROID_PACKAGE || 'com.mymind.mobile'
const activityName = process.env.MYMIND_ANDROID_ACTIVITY || '.MainActivity'
const outputDirectory = path.resolve(
  process.env.MYMIND_ANDROID_SMOKE_OUTPUT || 'android-smoke-artifacts'
)
const timeoutMs = Number(process.env.MYMIND_ANDROID_SMOKE_TIMEOUT_MS || 120_000)

mkdirSync(outputDirectory, { recursive: true })

function adb(args, options = {}) {
  return execFileSync('adb', args, {
    encoding: 'utf8',
    timeout: options.timeout ?? 30_000,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe']
  }).trim()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function packagePid() {
  try {
    return adb(['shell', 'pidof', packageName], { timeout: 10_000 }).split(/\s+/)[0] || ''
  } catch {
    return ''
  }
}

function uiDump() {
  try {
    adb(['shell', 'uiautomator', 'dump', '/sdcard/mymind-ui.xml'], { timeout: 20_000 })
    return adb(['exec-out', 'cat', '/sdcard/mymind-ui.xml'], { timeout: 10_000 })
  } catch {
    return ''
  }
}

function decodeXml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function findNodeCenter(xml, label) {
  const nodePattern = /<node\b[^>]*\/>/g
  const attributePattern = /([\w-]+)="([^"]*)"/g

  for (const match of xml.matchAll(nodePattern)) {
    const attributes = Object.create(null)
    for (const attribute of match[0].matchAll(attributePattern)) {
      attributes[attribute[1]] = decodeXml(attribute[2])
    }

    if (attributes.text !== label && attributes['content-desc'] !== label) continue
    const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(attributes.bounds || '')
    if (!bounds) continue

    const [, left, top, right, bottom] = bounds.map(Number)
    if (right <= left || bottom <= top) continue
    return {
      x: Math.round((left + right) / 2),
      y: Math.round((top + bottom) / 2)
    }
  }

  return null
}

async function waitForUi(labels, description) {
  const deadline = Date.now() + timeoutMs
  let lastXml = ''

  while (Date.now() < deadline) {
    const pid = packagePid()
    if (pid) {
      lastXml = uiDump()
      if (lastXml && labels.every((label) => lastXml.includes(label))) {
        return { pid, xml: lastXml }
      }
    }
    await sleep(2_000)
  }

  writeFileSync(path.join(outputDirectory, 'last-ui.xml'), lastXml)
  throw new Error(`Timed out waiting for Android UI: ${description}`)
}

function captureArtifacts(pid, uiXml) {
  writeFileSync(path.join(outputDirectory, 'ui.xml'), uiXml)

  const screenshot = spawnSync('adb', ['exec-out', 'screencap', '-p'], {
    encoding: null,
    timeout: 20_000
  })
  if (screenshot.status === 0 && screenshot.stdout?.length) {
    writeFileSync(path.join(outputDirectory, 'screen.png'), screenshot.stdout)
  }

  try {
    const logcat = adb(['logcat', '--pid', pid, '-d', '-v', 'threadtime'], { timeout: 20_000 })
    writeFileSync(path.join(outputDirectory, 'app-logcat.txt'), `${logcat}\n`)
  } catch (error) {
    writeFileSync(
      path.join(outputDirectory, 'app-logcat-error.txt'),
      `${error instanceof Error ? error.stack || error.message : String(error)}\n`
    )
  }
}

console.log(`[MyMind] Android runtime smoke package: ${packageName}`)
adb(['wait-for-device'], { timeout: 120_000 })
adb(['logcat', '-c'])
adb(['shell', 'am', 'force-stop', packageName])

const launch = adb(['shell', 'am', 'start', '-W', '-n', `${packageName}/${activityName}`], {
  timeout: 60_000
})
console.log(launch)

let state
try {
  state = await waitForUi(['Главная', 'Заметки', 'Задачи', 'Привычки'], 'loaded Home screen')
  console.log(`[MyMind] Home rendered in process ${state.pid}.`)

  const notes = findNodeCenter(state.xml, 'Заметки')
  if (!notes) {
    throw new Error('Could not find a tappable “Заметки” node in the Home accessibility tree.')
  }

  adb(['shell', 'input', 'tap', String(notes.x), String(notes.y)])
  state = await waitForUi(['Заметки', 'Группы', '+ Заметка'], 'Notes screen after navigation')
  console.log('[MyMind] Notes navigation passed.')

  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
  state = await waitForUi(['Главная', 'Задачи', 'Привычки'], 'Home after Android back navigation')
  console.log('[MyMind] Android back navigation passed.')

  const currentPid = packagePid()
  if (!currentPid) throw new Error('MyMind process exited during the runtime smoke test.')
  state.pid = currentPid

  captureArtifacts(state.pid, state.xml)
  console.log('[MyMind] Android runtime smoke passed.')
} catch (error) {
  const pid = packagePid()
  captureArtifacts(pid || '0', uiDump())
  throw error
}
