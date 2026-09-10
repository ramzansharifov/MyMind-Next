# Android runtime smoke

Run from the repository root after a release APK is installed on an ADB-connected Android device or emulator:

```bash
npm run test:android-runtime --workspace=mymind-mobile
```

The smoke test cold-starts `com.mymind.mobile/.MainActivity`, waits for Home, and exercises the main application routing on the installed Android build. It opens Notes, Tasks, and Habits from the primary navigation, verifies screen-specific UI, and returns with Android Back. It then opens More and verifies that Study, Boards, Calendar, Diary, Workouts, Nutrition, Finance, Passwords, Movies, Music, and Settings can each render and return to More with Android Back.

After the navigation pass, the smoke test creates a uniquely named temporary note, adds a text block, backgrounds the application, force-stops the process, cold-launches the same installed build, and verifies that both the note metadata and autosaved text survived the restart. On a successful run the temporary note is deleted again. If the smoke test fails during this persistence stage, the temporary `mymind_ci_*` note may remain intentionally so the failure state can be inspected and removed manually.

During the run it checks that the MyMind process remains alive and fails if the current screen exposes the retry action used by the application error state. At the end it returns to Home and writes a screenshot, UI dump, and app-scoped logcat to `apps/mobile/android-smoke-artifacts/`.

This covers release-runtime navigation plus a controlled force-stop/relaunch persistence path. It is not a replacement for physical-device feature testing. Hardware-dependent flows such as camera/microphone input, real notification delivery, system document/share interactions, uncontrolled OS process-death recovery, and gesture/performance behavior still require targeted device checks.

Environment overrides:

- `MYMIND_ANDROID_PACKAGE` — Android package name.
- `MYMIND_ANDROID_ACTIVITY` — launch activity.
- `MYMIND_ANDROID_SMOKE_OUTPUT` — artifact directory relative to the mobile workspace when invoked through npm workspaces.
- `MYMIND_ANDROID_SMOKE_TIMEOUT_MS` — per-screen wait timeout.
