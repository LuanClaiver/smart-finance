@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0mobile-app"
if not exist "android\gradlew.bat" (
  echo Execute primeiro "Preparar APK.bat".
  pause
  exit /b 1
)
call npx cap open android
