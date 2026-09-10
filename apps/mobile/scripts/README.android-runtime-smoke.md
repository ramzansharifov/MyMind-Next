# Android runtime smoke

Run from the repository root after a release APK is installed on an ADB-connected Android device or emulator:

```bash
npm run test:android-runtime --workspace=mymind-mobile
```

The smoke test cold-starts `com.mymind.mobile/.MainActivity`, waits for Home, opens Notes, verifies Notes-specific UI, sends Android Back, verifies Home again, confirms the process is still alive, and writes a screenshot, UI dump, and app-scoped logcat to `apps/mobile/android-smoke-artifacts/`.

Environment overrides:

- `MYMIND_ANDROID_PACKAGE` — Android package name.
- `MYMIND_ANDROID_ACTIVITY` — launch activity.
- `MYMIND_ANDROID_SMOKE_OUTPUT` — artifact directory relative to the mobile workspace when invoked through npm workspaces.
- `MYMIND_ANDROID_SMOKE_TIMEOUT_MS` — per-screen wait timeout.
