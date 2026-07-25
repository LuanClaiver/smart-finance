param(
  [Parameter(Mandatory=$true)][string]$AndroidPath
)
$ErrorActionPreference = 'Stop'

$manifest = Join-Path $AndroidPath 'app\src\main\AndroidManifest.xml'
if (Test-Path $manifest) {
  $content = Get-Content $manifest -Raw
  if ($content -notmatch 'android.permission.POST_NOTIFICATIONS') {
    $content = $content -replace '<manifest([^>]*)>', '<manifest$1>`r`n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
  }
  if ($content -notmatch 'android.permission.INTERNET') {
    $content = $content -replace '<manifest([^>]*)>', '<manifest$1>`r`n    <uses-permission android:name="android.permission.INTERNET" />'
  }
  if ($content -match 'android:allowBackup="[^"]*"') {
    $content = $content -replace 'android:allowBackup="[^"]*"', 'android:allowBackup="false"'
  } else {
    $content = $content -replace '<application', '<application android:allowBackup="false"'
  }
  if ($content -notmatch 'android:fullBackupContent=') {
    $content = $content -replace '<application', '<application android:fullBackupContent="false"'
  }
  Set-Content -Path $manifest -Value $content -Encoding UTF8
}

$buildGradle = Join-Path $AndroidPath 'app\build.gradle'
if (Test-Path $buildGradle) {
  $content = Get-Content $buildGradle -Raw
  if ($content -notmatch "build-data\.properties") {
    $content = $content -replace 'android\s*\{', "android {`r`n    packagingOptions {`r`n        resources.excludes += ['build-data.properties']`r`n    }"
    Set-Content -Path $buildGradle -Value $content -Encoding UTF8
  }
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

$sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdkPath) {
  $escaped = $sdkPath.Replace('\', '\\')
  "sdk.dir=$escaped" | Set-Content -Path (Join-Path $AndroidPath 'local.properties') -Encoding ASCII
}
