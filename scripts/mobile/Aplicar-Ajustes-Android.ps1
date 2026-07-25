param(
  [Parameter(Mandatory=$true)][string]$AndroidPath
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $AndroidPath)) {
  throw "Projeto Android não encontrado em: $AndroidPath"
}

$newLine = [Environment]::NewLine
$manifest = Join-Path $AndroidPath 'app\src\main\AndroidManifest.xml'
if (Test-Path $manifest) {
  $content = Get-Content $manifest -Raw

  $permissions = @()
  if ($content -notmatch 'android.permission.POST_NOTIFICATIONS') {
    $permissions += '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
  }
  if ($content -notmatch 'android.permission.INTERNET') {
    $permissions += '    <uses-permission android:name="android.permission.INTERNET" />'
  }
  if ($permissions.Count -gt 0) {
    $permissionText = $newLine + ($permissions -join $newLine)
    $content = [regex]::Replace($content, '(<manifest\b[^>]*>)', '$1' + $permissionText, 1)
  }

  if ($content -match 'android:allowBackup="[^"]*"') {
    $content = $content -replace 'android:allowBackup="[^"]*"', 'android:allowBackup="false"'
  } else {
    $content = [regex]::Replace($content, '<application\b', '<application android:allowBackup="false"', 1)
  }

  if ($content -notmatch 'android:fullBackupContent=') {
    $content = [regex]::Replace($content, '<application\b', '<application android:fullBackupContent="false"', 1)
  }

  Set-Content -Path $manifest -Value $content -Encoding UTF8
}

$buildGradle = Join-Path $AndroidPath 'app\build.gradle'
if (Test-Path $buildGradle) {
  $content = Get-Content $buildGradle -Raw

  if ($content -notmatch 'build-data\.properties') {
    $packaging = @"
android {
    packagingOptions {
        resources.excludes += ['build-data.properties']
    }
"@
    $content = [regex]::Replace($content, 'android\s*\{', [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $packaging.TrimEnd() }, 1)
  }

  # Cada execução do GitHub recebe um versionCode maior. Isso permite instalar
  # as próximas compilações por cima da versão anterior no celular.
  $runNumber = 1
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_RUN_NUMBER)) {
    $parsed = 0
    if ([int]::TryParse($env:GITHUB_RUN_NUMBER, [ref]$parsed) -and $parsed -gt 0) {
      $runNumber = $parsed
    }
  }
  $packageFile = Join-Path (Split-Path $AndroidPath -Parent) 'package.json'
  $versionName = '0.3.3'
  if (Test-Path $packageFile) {
    try {
      $package = Get-Content $packageFile -Raw | ConvertFrom-Json
      if (-not [string]::IsNullOrWhiteSpace([string]$package.version)) {
        $versionName = [string]$package.version
      }
    } catch {
      Write-Warning 'Não foi possível ler a versão do package.json; usando 0.3.3.'
    }
  }
  $content = $content -replace 'versionCode\s+\d+', "versionCode $runNumber"
  $content = $content -replace 'versionName\s+"[^"]+"', "versionName `"$versionName`""

  Set-Content -Path $buildGradle -Value $content -Encoding UTF8
}

$drawableDir = Join-Path $AndroidPath 'app\src\main\res\drawable'
New-Item -ItemType Directory -Path $drawableDir -Force | Out-Null
$notificationIcon = Join-Path $drawableDir 'ic_stat_smart_finance.xml'
@'
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M4,3h16a1,1 0,0 1,1 1v16a1,1 0,0 1,-1 1H4a1,1 0,0 1,-1 -1V4a1,1 0,0 1,1 -1M7,7v10h2V7H7m4,3v7h2v-7h-2m4,-3v10h2V7h-2z" />
</vector>
'@ | Set-Content -Path $notificationIcon -Encoding UTF8

Write-Host 'Ajustes Android aplicados.' -ForegroundColor Green
