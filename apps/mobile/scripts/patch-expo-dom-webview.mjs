import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const requireFromHere = createRequire(import.meta.url)

const BUGGY_PROP_EFFECT = `  // When the \`marshalProps\` change, emit them to the webview.
  React.useEffect(() => {
    emit({ type: '$$props', data: smartActions });
  }, [emit, smartActions]);`

const FIXED_PROP_EFFECT = `  const domReadyRef = React.useRef(false);
  const latestSmartActionsRef = React.useRef(smartActions);
  latestSmartActionsRef.current = smartActions;

  // @expo/dom-webview on Android can reject injectJavaScript before its Fabric view
  // is registered. Initial props are already injected during page creation, so wait
  // for the DOM runtime handshake before sending subsequent prop updates.
  React.useEffect(() => {
    if (!domReadyRef.current) return;
    emit({ type: '$$props', data: smartActions });
  }, [emit, smartActions]);`

const BUGGY_DOM_READY = `      if (type === DOM_READY) {
        // Re-send the props the DOM side missed while the WebView was loading.
        emit({ type: '$$props', data: smartActions });
        return;
      }`

const FIXED_DOM_READY = `      if (type === DOM_READY) {
        domReadyRef.current = true;
        // Re-send the latest props the DOM side missed while the WebView was loading.
        emit({ type: '$$props', data: latestSmartActionsRef.current });
        return;
      }`

const PATCH_MARKER = 'const domReadyRef = React.useRef(false);'

export function patchExpoDomWebViewSource(source) {
  if (source.includes(PATCH_MARKER)) {
    if (
      !source.includes('if (!domReadyRef.current) return;') ||
      !source.includes("data: latestSmartActionsRef.current")
    ) {
      throw new Error('Incomplete MyMind Expo DOM readiness patch')
    }
    return { source, changed: false }
  }

  if (!source.includes(BUGGY_PROP_EFFECT)) {
    throw new Error('Unsupported Expo DOM prop-effect implementation')
  }
  if (!source.includes(BUGGY_DOM_READY)) {
    throw new Error('Unsupported Expo DOM ready-handshake implementation')
  }

  const next = source.replace(BUGGY_PROP_EFFECT, FIXED_PROP_EFFECT).replace(
    BUGGY_DOM_READY,
    FIXED_DOM_READY
  )

  return { source: next, changed: true }
}

export async function patchInstalledExpoDomWebView() {
  const packageJsonPath = requireFromHere.resolve('expo/package.json')
  const wrapperPath = path.join(path.dirname(packageJsonPath), 'src', 'dom', 'webview-wrapper.tsx')
  const source = await readFile(wrapperPath, 'utf8')
  const patched = patchExpoDomWebViewSource(source)

  if (patched.changed) {
    await writeFile(wrapperPath, patched.source, 'utf8')
    console.log('[MyMind] Applied Expo DOM Android readiness compatibility patch.')
  }

  return wrapperPath
}

const invokedAsScript =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedAsScript) await patchInstalledExpoDomWebView()
