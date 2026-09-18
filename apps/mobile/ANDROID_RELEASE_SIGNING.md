# Android release signing

MyMind Android releases must always be signed with the same private key. Do not commit the
keystore or its passwords to Git.

## Recommended one-time setup on Windows

From the repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\mobile\scripts\setup-android-release-signing.ps1
```

The helper creates the JKS outside the repository at
`%USERPROFILE%\.mymind\signing\mymind-android-release.jks`, verifies it, and configures the four
required repository secrets through GitHub CLI. It never prints the signing password and never
adds the private key to Git.

Requirements: `keytool` and authenticated GitHub CLI (`gh auth login`).

If you prefer to create the key manually, run from a private local directory:

```powershell
keytool -genkeypair -v `
  -keystore mymind-android-release.jks `
  -storetype JKS `
  -alias mymind `
  -keyalg RSA `
  -keysize 4096 `
  -validity 10000
```

Keep `mymind-android-release.jks` in a secure backup. Losing this key means future APKs cannot
update an already installed MyMind application with package id `com.mymind.mobile`.

Convert the keystore to Base64 without line breaks:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes((Resolve-Path ".\mymind-android-release.jks"))
) | Set-Clipboard
```

## Required GitHub Actions secrets

Configure these repository secrets:

- `MYMIND_ANDROID_KEYSTORE_BASE64` — Base64 contents of the JKS file.
- `MYMIND_ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `MYMIND_ANDROID_KEY_ALIAS` — alias used when creating the key, normally `mymind`.
- `MYMIND_ANDROID_KEY_PASSWORD` — private key password.

The release workflow reconstructs the JKS only inside the ephemeral GitHub Actions runner,
builds the signed APK, verifies it with Android `apksigner`, and then discards the runner.

## Release invariant

Never replace the signing key after publishing the first production APK. Every later
`mymind-mobile-X.Y.Z.apk` must use the same key so Android can install it as an update rather
than as an unrelated application.

## Versioning before a release

Desktop and Android versions must stay synchronized. From the repository root use:

```powershell
npm run release:version -- 1.1.4
```

The command updates desktop/mobile package versions, Expo `version`, the lockfile, and Android
`versionCode`. Android version codes use the monotonic mapping
`major * 10000 + minor * 100 + patch` (for example `1.1.4 -> 10104`). The release workflow
rejects a tag if any of these values disagree.
