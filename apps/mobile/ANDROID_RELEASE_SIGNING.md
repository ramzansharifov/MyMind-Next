# Android release signing

MyMind Android releases must always be signed with the same private key. Do not commit the
keystore or its passwords to Git.

## One-time key creation on Windows

Run from a private local directory:

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
