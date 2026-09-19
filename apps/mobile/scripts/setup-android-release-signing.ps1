param(
  [string]$Repository = "ramzansharifov/MyMind-Next",
  [string]$KeystorePath = (Join-Path $HOME ".mymind\signing\mymind-android-release.jks")
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Read-PlainTextPassword {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Set-GitHubSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Repo
  )

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = "gh"
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  if ($Name -notmatch '^[A-Z0-9_]+

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw "Failed to start GitHub CLI while setting $Name."
  }

  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()

  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Failed to set GitHub secret $Name. $errorOutput $output"
  }

  Write-Host "[MyMind] GitHub secret configured: $Name"
}

Require-Command "keytool"
Require-Command "gh"

Write-Host "[MyMind] Checking GitHub CLI authentication..."
& gh auth status
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login' and retry."
}

$keystoreDirectory = Split-Path -Parent $KeystorePath
New-Item -ItemType Directory -Force -Path $keystoreDirectory | Out-Null

$alias = "mymind"
$password = Read-PlainTextPassword "Enter a strong password for the MyMind Android signing key"

if ([string]::IsNullOrWhiteSpace($password)) {
  throw "Signing password cannot be empty."
}

try {
  $env:MYMIND_SIGNING_PASSWORD = $password

  if (-not (Test-Path $KeystorePath)) {
    Write-Host "[MyMind] Creating permanent Android signing key at:"
    Write-Host "         $KeystorePath"

    & keytool -genkeypair -v `
      -keystore $KeystorePath `
      -storetype JKS `
      -storepass:env MYMIND_SIGNING_PASSWORD `
      -keypass:env MYMIND_SIGNING_PASSWORD `
      -alias $alias `
      -keyalg RSA `
      -keysize 4096 `
      -validity 10000 `
      -dname "CN=MyMind, OU=Release, O=MyMind"

    if ($LASTEXITCODE -ne 0) {
      throw "keytool failed to create the Android signing key."
    }
  }
  else {
    Write-Host "[MyMind] Existing signing key found; it will not be overwritten:"
    Write-Host "         $KeystorePath"
  }

  & keytool -list `
    -keystore $KeystorePath `
    -storepass:env MYMIND_SIGNING_PASSWORD `
    -alias $alias | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "The keystore could not be opened with the supplied password or alias '$alias' was not found."
  }

  $keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath))

  Write-Host "[MyMind] Uploading encrypted release material to GitHub Actions secrets..."
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_BASE64" -Value $keystoreBase64 -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_PASSWORD" -Value $password -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_ALIAS" -Value $alias -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_PASSWORD" -Value $password -Repo $Repository

  Write-Host ""
  Write-Host "[MyMind] Android production signing is configured."
  Write-Host "[MyMind] IMPORTANT: back up this file securely and keep the password separately:"
  Write-Host "         $KeystorePath"
  Write-Host "[MyMind] Never delete or replace this key after the first production APK release."
}
finally {
  Remove-Item Env:MYMIND_SIGNING_PASSWORD -ErrorAction SilentlyContinue
  $password = $null
}
) {
    throw "Invalid GitHub secret name: $Name"
  }
  if ($Repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw "Failed to start GitHub CLI while setting $Name."
  }

  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()

  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Failed to set GitHub secret $Name. $errorOutput $output"
  }

  Write-Host "[MyMind] GitHub secret configured: $Name"
}

Require-Command "keytool"
Require-Command "gh"

Write-Host "[MyMind] Checking GitHub CLI authentication..."
& gh auth status
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login' and retry."
}

$keystoreDirectory = Split-Path -Parent $KeystorePath
New-Item -ItemType Directory -Force -Path $keystoreDirectory | Out-Null

$alias = "mymind"
$password = Read-PlainTextPassword "Enter a strong password for the MyMind Android signing key"

if ([string]::IsNullOrWhiteSpace($password)) {
  throw "Signing password cannot be empty."
}

try {
  $env:MYMIND_SIGNING_PASSWORD = $password

  if (-not (Test-Path $KeystorePath)) {
    Write-Host "[MyMind] Creating permanent Android signing key at:"
    Write-Host "         $KeystorePath"

    & keytool -genkeypair -v `
      -keystore $KeystorePath `
      -storetype JKS `
      -storepass:env MYMIND_SIGNING_PASSWORD `
      -keypass:env MYMIND_SIGNING_PASSWORD `
      -alias $alias `
      -keyalg RSA `
      -keysize 4096 `
      -validity 10000 `
      -dname "CN=MyMind, OU=Release, O=MyMind"

    if ($LASTEXITCODE -ne 0) {
      throw "keytool failed to create the Android signing key."
    }
  }
  else {
    Write-Host "[MyMind] Existing signing key found; it will not be overwritten:"
    Write-Host "         $KeystorePath"
  }

  & keytool -list `
    -keystore $KeystorePath `
    -storepass:env MYMIND_SIGNING_PASSWORD `
    -alias $alias | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "The keystore could not be opened with the supplied password or alias '$alias' was not found."
  }

  $keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath))

  Write-Host "[MyMind] Uploading encrypted release material to GitHub Actions secrets..."
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_BASE64" -Value $keystoreBase64 -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_PASSWORD" -Value $password -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_ALIAS" -Value $alias -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_PASSWORD" -Value $password -Repo $Repository

  Write-Host ""
  Write-Host "[MyMind] Android production signing is configured."
  Write-Host "[MyMind] IMPORTANT: back up this file securely and keep the password separately:"
  Write-Host "         $KeystorePath"
  Write-Host "[MyMind] Never delete or replace this key after the first production APK release."
}
finally {
  Remove-Item Env:MYMIND_SIGNING_PASSWORD -ErrorAction SilentlyContinue
  $password = $null
}
) {
    throw "Invalid GitHub repository name: $Repo"
  }
  $startInfo.Arguments = ('secret set "{0}" --repo "{1}"' -f $Name, $Repo)

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw "Failed to start GitHub CLI while setting $Name."
  }

  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()

  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Failed to set GitHub secret $Name. $errorOutput $output"
  }

  Write-Host "[MyMind] GitHub secret configured: $Name"
}

Require-Command "keytool"
Require-Command "gh"

Write-Host "[MyMind] Checking GitHub CLI authentication..."
& gh auth status
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login' and retry."
}

$keystoreDirectory = Split-Path -Parent $KeystorePath
New-Item -ItemType Directory -Force -Path $keystoreDirectory | Out-Null

$alias = "mymind"
$password = Read-PlainTextPassword "Enter a strong password for the MyMind Android signing key"

if ([string]::IsNullOrWhiteSpace($password)) {
  throw "Signing password cannot be empty."
}

try {
  $env:MYMIND_SIGNING_PASSWORD = $password

  if (-not (Test-Path $KeystorePath)) {
    Write-Host "[MyMind] Creating permanent Android signing key at:"
    Write-Host "         $KeystorePath"

    & keytool -genkeypair -v `
      -keystore $KeystorePath `
      -storetype JKS `
      -storepass:env MYMIND_SIGNING_PASSWORD `
      -keypass:env MYMIND_SIGNING_PASSWORD `
      -alias $alias `
      -keyalg RSA `
      -keysize 4096 `
      -validity 10000 `
      -dname "CN=MyMind, OU=Release, O=MyMind"

    if ($LASTEXITCODE -ne 0) {
      throw "keytool failed to create the Android signing key."
    }
  }
  else {
    Write-Host "[MyMind] Existing signing key found; it will not be overwritten:"
    Write-Host "         $KeystorePath"
  }

  & keytool -list `
    -keystore $KeystorePath `
    -storepass:env MYMIND_SIGNING_PASSWORD `
    -alias $alias | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "The keystore could not be opened with the supplied password or alias '$alias' was not found."
  }

  $keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath))

  Write-Host "[MyMind] Uploading encrypted release material to GitHub Actions secrets..."
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_BASE64" -Value $keystoreBase64 -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEYSTORE_PASSWORD" -Value $password -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_ALIAS" -Value $alias -Repo $Repository
  Set-GitHubSecret -Name "MYMIND_ANDROID_KEY_PASSWORD" -Value $password -Repo $Repository

  Write-Host ""
  Write-Host "[MyMind] Android production signing is configured."
  Write-Host "[MyMind] IMPORTANT: back up this file securely and keep the password separately:"
  Write-Host "         $KeystorePath"
  Write-Host "[MyMind] Never delete or replace this key after the first production APK release."
}
finally {
  Remove-Item Env:MYMIND_SIGNING_PASSWORD -ErrorAction SilentlyContinue
  $password = $null
}
