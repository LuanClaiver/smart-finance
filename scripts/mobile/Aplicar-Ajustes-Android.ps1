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
  if ($content -notmatch 'android.permission.WRITE_EXTERNAL_STORAGE') {
    $permissions += '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />'
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
  $versionName = '0.3.5'
  if (Test-Path $packageFile) {
    try {
      $package = Get-Content $packageFile -Raw | ConvertFrom-Json
      if (-not [string]::IsNullOrWhiteSpace([string]$package.version)) {
        $versionName = [string]$package.version
      }
    } catch {
      Write-Warning 'Não foi possível ler a versão do package.json; usando 0.3.5.'
    }
  }
  $content = $content -replace 'versionCode\s+\d+', "versionCode $runNumber"
  $content = $content -replace 'versionName\s+"[^"]+"', "versionName `"$versionName`""

  Set-Content -Path $buildGradle -Value $content -Encoding UTF8
}

# Plugin nativo usado para colocar o banco diretamente na pasta pública Downloads.
$javaDir = Join-Path $AndroidPath 'app\src\main\java\com\smartfinance\app'
New-Item -ItemType Directory -Path $javaDir -Force | Out-Null

$downloadPlugin = Join-Path $javaDir 'SmartFinanceDownloadsPlugin.java'
@'
package com.smartfinance.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "SmartFinanceDownloads",
    permissions = {
        @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class SmartFinanceDownloadsPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        saveFileInternal(call);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            saveFileInternal(call);
        } else {
            call.reject("Permissão para salvar na pasta Downloads não foi concedida.");
        }
    }

    private void saveFileInternal(PluginCall call) {
        String sourceUri = call.getString("sourceUri");
        String filename = sanitizeFilename(call.getString("filename", "smart-finance.db"));
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (sourceUri == null || sourceUri.trim().isEmpty()) {
            call.reject("O arquivo de origem do banco não foi localizado.");
            return;
        }

        try (InputStream input = openSource(sourceUri)) {
            DownloadTarget target = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? saveWithMediaStore(input, filename, mimeType)
                : saveLegacy(input, filename, mimeType);

            JSObject result = new JSObject();
            result.put("name", target.name);
            result.put("uri", target.uri);
            result.put("location", "Downloads");
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível salvar o banco na pasta Downloads: " + error.getMessage(), error);
        }
    }

    private InputStream openSource(String sourceUri) throws Exception {
        Uri uri = Uri.parse(sourceUri);
        if ("content".equalsIgnoreCase(uri.getScheme())) {
            InputStream stream = getContext().getContentResolver().openInputStream(uri);
            if (stream == null) throw new IllegalStateException("Não foi possível abrir o banco interno.");
            return stream;
        }
        String path = "file".equalsIgnoreCase(uri.getScheme()) ? uri.getPath() : sourceUri;
        if (path == null || path.trim().isEmpty()) throw new IllegalStateException("Caminho interno inválido.");
        return new FileInputStream(new File(path));
    }

    private DownloadTarget saveWithMediaStore(InputStream input, String filename, String mimeType) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("O Android não criou o arquivo em Downloads.");

        boolean completed = false;
        try (OutputStream output = resolver.openOutputStream(uri, "w")) {
            if (output == null) throw new IllegalStateException("Não foi possível escrever no arquivo de destino.");
            copy(input, output);
            completed = true;
        } finally {
            if (!completed) resolver.delete(uri, null, null);
        }

        values.clear();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(uri, values, null, null);
        return new DownloadTarget(filename, uri.toString());
    }

    @SuppressWarnings("deprecation")
    private DownloadTarget saveLegacy(InputStream input, String filename, String mimeType) throws Exception {
        File directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("A pasta Downloads não pôde ser criada.");
        }
        File target = uniqueFile(directory, filename);
        try (OutputStream output = new FileOutputStream(target)) {
            copy(input, output);
        }
        MediaScannerConnection.scanFile(getContext(), new String[]{ target.getAbsolutePath() }, new String[]{ mimeType }, null);
        return new DownloadTarget(target.getName(), Uri.fromFile(target).toString());
    }

    private static void copy(InputStream input, OutputStream output) throws Exception {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
        output.flush();
    }

    private static File uniqueFile(File directory, String filename) {
        File first = new File(directory, filename);
        if (!first.exists()) return first;
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        String extension = dot > 0 ? filename.substring(dot) : "";
        int index = 1;
        File candidate;
        do {
            candidate = new File(directory, base + "-" + index + extension);
            index++;
        } while (candidate.exists());
        return candidate;
    }

    private static String sanitizeFilename(String filename) {
        String clean = filename.replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        return clean.isEmpty() ? "smart-finance.db" : clean;
    }

    private static final class DownloadTarget {
        final String name;
        final String uri;
        DownloadTarget(String name, String uri) {
            this.name = name;
            this.uri = uri;
        }
    }
}
'@ | Set-Content -Path $downloadPlugin -Encoding UTF8

$mainActivity = Join-Path $javaDir 'MainActivity.java'
@'
package com.smartfinance.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmartFinanceDownloadsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
'@ | Set-Content -Path $mainActivity -Encoding UTF8

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

Write-Host 'Ajustes Android aplicados, incluindo exportação para Downloads.' -ForegroundColor Green
