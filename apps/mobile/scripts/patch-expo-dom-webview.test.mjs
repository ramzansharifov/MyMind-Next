import assert from 'node:assert/strict'
import { patchExpoDomWebViewSource } from './patch-expo-dom-webview.mjs'

const buggy = `
  const initialPropsRef = React.useRef(smartActions);

  // When the \`marshalProps\` change, emit them to the webview.
  React.useEffect(() => {
    emit({ type: '$$props', data: smartActions });
  }, [emit, smartActions]);

  return React.createElement(webView, {
    onMessage: (event) => {
      const { type, data } = JSON.parse(event.nativeEvent.data);

      if (type === DOM_READY) {
        // Re-send the props the DOM side missed while the WebView was loading.
        emit({ type: '$$props', data: smartActions });
        return;
      }

      if (type === REGISTER_DOM_IMPERATIVE_HANDLE_PROPS) {
        domImperativeHandlePropsRef.current = data;
      }
    },
  });
`

const patched = patchExpoDomWebViewSource(buggy)
assert.equal(patched.changed, true)
assert.match(patched.source, /const domReadyRef = React\.useRef\(false\)/)
assert.match(patched.source, /const latestSmartActionsRef = React\.useRef\(smartActions\)/)
assert.match(patched.source, /if \(!domReadyRef\.current\) return/)
assert.match(patched.source, /domReadyRef\.current = true/)
assert.match(patched.source, /data: latestSmartActionsRef\.current/)
assert.doesNotMatch(
  patched.source,
  /\/\/ When the \`marshalProps\` change, emit them to the webview\.\n  React\.useEffect\(\(\) => \{\n    emit/
)

const alreadyPatched = patchExpoDomWebViewSource(patched.source)
assert.equal(alreadyPatched.changed, false)
assert.equal(alreadyPatched.source, patched.source)

console.log('Expo DOM Android readiness patch regression passed')
