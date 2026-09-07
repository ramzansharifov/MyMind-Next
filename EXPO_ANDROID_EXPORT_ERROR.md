# Expo Android export failure

```text

> mymind@1.0.0 export:android
> npm run export:android --workspace=mymind-mobile


> mymind-mobile@1.0.0 export:android
> expo export --platform android

Using src/app as the root directory for Expo Router.
Expo Autolinking module resolution enabled
Starting Metro Bundler

Android Bundled 13416ms apps/mobile/index.ts (1264 modules)
DOM Bundled 52108ms apps/mobile/src/modules/boards/BoardCanvasDom.tsx (3249 modules)
Error: Asset not found: _expo/static/js/web/__common-4c8940ca09d1ebe9feab00633bb32761.js
Error: Asset not found: _expo/static/js/web/__common-4c8940ca09d1ebe9feab00633bb32761.js
    at visit (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:138:28)
    at /home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:140:13
    at Array.forEach (<anonymous>)
    at visit (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:139:109)
    at /home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:148:13
    at Array.forEach (<anonymous>)
    at assetsRequiresSort (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:146:12)
    at htmlFromSerialAssets (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:72:27)
    at serializeHtmlWithAssets (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/start/server/metro/serializeHtml.js:34:12)
    at exportDomComponentAsync (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/export/exportDomComponents.js:111:67)
    at async /home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/export/exportApp.js:247:85
    at async Promise.all (index 0)
    at async /home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/export/exportApp.js:245:17
    at async Promise.all (index 0)
    at async exportAppAsync (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/export/exportApp.js:200:13)
    at async exportAsync (/home/runner/work/MyMind-Next/MyMind-Next/node_modules/@expo/cli/build/src/export/exportAsync.js:91:5)
npm error Lifecycle script `export:android` failed with error:
npm error code 1
npm error path /home/runner/work/MyMind-Next/MyMind-Next/apps/mobile
npm error workspace mymind-mobile@1.0.0
npm error location /home/runner/work/MyMind-Next/MyMind-Next/apps/mobile
npm error command failed
npm error command sh -c expo export --platform android
```
