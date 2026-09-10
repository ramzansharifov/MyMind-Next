import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const packageName = process.env.MYMIND_ANDROID_PACKAGE || 'com.mymind.mobile'
const activityName = process.env.MYMIND_ANDROID_ACTIVITY || '.MainActivity'
const outputDirectory = path.resolve(
  process.env.MYMIND_ANDROID_SMOKE_OUTPUT || 'android-smoke-artifacts'
)
const timeoutMs = Number(process.env.MYMIND_ANDROID_SMOKE_TIMEOUT_MS || 120_000)

const homeLabels = ['Главная', 'Заметки', 'Задачи', 'Привычки']
const primaryRoutes = [
  { title: 'Заметки', markers: ['Группы', '+ Заметка'] },
  { title: 'Задачи', markers: ['Группы', '+ Задача', 'Быстро добавить задачу'] },
  { title: 'Привычки', markers: ['День', 'Отчёт', '+ Привычка', 'Дата привычек'] }
]
const moreRoutes = [
  'Обучение',
  'Доски',
  'Календарь',
  'Дневник',
  'Тренировки',
  'Питание',
  'Финансы',
  'Пароли',
  'Фильмы',
  'Музыка',
  'Настройки'
]

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

function xmlNodes(xml) {
  const nodePattern = /<node\b[^>]*\/?>(?:<\/node>)?/g
  const attributePattern = /([\w-]+)="([^"]*)"/g
  const nodes = []
  for (const match of xml.matchAll(nodePattern)) {
    const attributes = Object.create(null)
    for (const attribute of match[0].matchAll(attributePattern)) {
      attributes[attribute[1]] = decodeXml(attribute[2])
    }
    nodes.push(attributes)
  }
  return nodes
}

function findNodeCenter(xml, label, { clickable } = {}) {
  for (const attributes of xmlNodes(xml)) {
    if (attributes.text !== label && attributes['content-desc'] !== label) continue
    if (clickable !== undefined && attributes.clickable !== String(clickable)) continue
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

function hasPlainText(xml, label) {
  return xmlNodes(xml).some(
    (node) => node.text === label && node.clickable !== 'true' && node['content-desc'] !== label
  )
}

function hasClickableLabel(xml, label) {
  return xmlNodes(xml).some(
    (node) =>
      node.clickable === 'true' && (node.text === label || node['content-desc'] === label)
  )
}

function assertHealthyUi(xml, description) {
  if (!packagePid()) throw new Error(`MyMind process exited while checking ${description}.`)
  if (hasClickableLabel(xml, 'Повторить')) {
    throw new Error(`MyMind displayed a retryable error while checking ${description}.`)
  }
}

async function waitForUi(labels, description, predicate = () => true) {
  const deadline = Date.now() + timeoutMs
  let lastXml = ''

  while (Date.now() < deadline) {
    const pid = packagePid()
    if (pid) {
      lastXml = uiDump()
      if (lastXml && labels.every((label) => lastXml.includes(label)) && predicate(lastXml)) {
        assertHealthyUi(lastXml, description)
        return { pid, xml: lastXml }
      }
    }
    await sleep(1_500)
  }

  writeFileSync(path.join(outputDirectory, 'last-ui.xml'), lastXml)
  throw new Error(`Timed out waiting for Android UI: ${description}`)
}

async function tapVisibleLabel(label, description, maxScrolls = 0) {
  for (let attempt = 0; attempt <= maxScrolls; attempt += 1) {
    const xml = uiDump()
    assertHealthyUi(xml, description)
    const point = findNodeCenter(xml, label, { clickable: true })
    if (point) {
      adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
      return
    }
    if (attempt < maxScrolls) {
      adb(['shell', 'input', 'swipe', '160', '500', '160', '220', '250'])
      await sleep(700)
    }
  }
  throw new Error(`Could not find tappable “${label}” while ${description}.`)
}

async function waitForDeepRoute(title) {
  return waitForUi([title], `${title} screen`, (xml) => {
    return hasPlainText(xml, title) && !hasClickableLabel(xml, title)
  })
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
  state = await waitForUi(homeLabels, 'loaded Home screen')
  console.log(`[MyMind] Home rendered in process ${state.pid}.`)

  for (const route of primaryRoutes) {
    await tapVisibleLabel(route.title, `opening ${route.title}`)
    state = await waitForUi([route.title, ...route.markers], `${route.title} primary screen`)
    console.log(`[MyMind] ${route.title} primary navigation passed.`)

    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
    state = await waitForUi(homeLabels, `Home after backing out of ${route.title}`)
  }

  await tapVisibleLabel('Ещё', 'opening More')
  state = await waitForUi(['Ещё', 'Обучение', 'Доски'], 'More screen')
  console.log('[MyMind] More navigation passed.')

  for (const title of moreRoutes) {
    await tapVisibleLabel(title, `opening ${title} from More`, 8)
    state = await waitForDeepRoute(title)
    console.log(`[MyMind] ${title} module opened.`)

    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
    state = await waitForUi(['Ещё', 'Обучение', 'Доски'], `More after backing out of ${title}`)
  }

  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
  state = await waitForUi(homeLabels, 'Home after Android back navigation from More')
  console.log('[MyMind] Android back navigation passed across primary and More routes.')

  const currentPid = packagePid()
  if (!currentPid) throw new Error('MyMind process exited during the runtime smoke test.')
  state.pid = currentPid

  captureArtifacts(state.pid, state.xml)
  console.log('[MyMind] Full Android module runtime smoke passed.')
} catch (error) {
  const pid = packagePid()
  captureArtifacts(pid || '0', uiDump())
  throw error
}
