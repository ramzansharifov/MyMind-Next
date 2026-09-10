# Android runtime smoke

Run from the repository root after a release APK is installed on an ADB-connected Android device or emulator:

```bash
npm run test:android-runtime --workspace=mymind-mobile
```

The smoke test cold-starts `com.mymind.mobile/.MainActivity`, waits for Home, and exercises the main application routing on the installed Android build. It opens Notes, Tasks, and Habits from the primary navigation, verifies screen-specific UI, and returns with Android Back. It then opens More and verifies that Study, Boards, Calendar, Diary, Workouts, Nutrition, Finance, Passwords, Movies, Music, and Settings can each render and return to More with Android Back.

During the run it checks that the MyMind process remains alive and fails if the current screen exposes the retry action used by the application error state. At the end it returns to Home and writes a screenshot, UI dump, and app-scoped logcat to `apps/mobile/android-smoke-artifacts/`.

This is a release-runtime navigation smoke, not a replacement for feature-level or physical-device testing. Hardware-dependent flows such as camera/microphone input, real notification delivery, system document/share interactions, process-death recovery, and gesture/performance behavior still require targeted device checks.

Environment overrides:

- `MYMIND_ANDROID_PACKAGE` — Android package name.
- `MYMIND_ANDROID_ACTIVITY` — launch activity.
- `MYMIND_ANDROID_SMOKE_OUTPUT` — artifact directory relative to the mobile workspace when invoked through npm workspaces.
- `MYMIND_ANDROID_SMOKE_TIMEOUT_MS` — per-screen wait timeout.
