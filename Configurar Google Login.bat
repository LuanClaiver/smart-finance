@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0mobile-app"

echo ================================================
echo     SMART FINANCE - CONFIGURAR GOOGLE LOGIN
echo ================================================
echo.
echo Cole o ID de cliente OAuth do tipo APLICATIVO DA WEB.
echo Exemplo: 123456789-abc.apps.googleusercontent.com
echo.
set /p GOOGLE_ID=ID do cliente Web: 
if "%GOOGLE_ID%"=="" (
  echo Nenhum ID informado.
  pause
  exit /b 1
)

echo %GOOGLE_ID% | findstr /i /r "\.apps\.googleusercontent\.com$" >nul
if errorlevel 1 (
  echo ERRO: O valor nao parece ser um ID de cliente Google valido.
  pause
  exit /b 1
)

> ".env.local" echo VITE_GOOGLE_WEB_CLIENT_ID=%GOOGLE_ID%

echo Compilando e sincronizando...
call npm run build
if errorlevel 1 goto :erro
if not exist "android\gradlew.bat" (
  call npx cap add android
  if errorlevel 1 goto :erro
)
call npx cap sync android
if errorlevel 1 goto :erro
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\mobile\Aplicar-Ajustes-Android.ps1" "%cd%\android"
if errorlevel 1 goto :erro

echo.
echo Login Google configurado no codigo.
echo Lembre-se de cadastrar o pacote com.smartfinance.app e o SHA-1 no Google Cloud.
pause
exit /b 0

:erro
echo ERRO ao compilar ou sincronizar o aplicativo.
pause
exit /b 1
