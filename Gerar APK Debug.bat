@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0mobile-app"
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
if not exist "android\gradlew.bat" (
  echo O projeto Android ainda nao foi preparado.
  call "%~dp0Preparar APK.bat"
  if errorlevel 1 exit /b 1
  cd /d "%~dp0mobile-app"
)

echo Compilando a interface...
call npm run build || goto :erro
call npx cap sync android || goto :erro
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\mobile\Aplicar-Ajustes-Android.ps1" "%cd%\android" || goto :erro

echo Gerando APK de teste...
cd android
call gradlew.bat assembleDebug || goto :erro
cd /d "%~dp0"
if not exist "APK" mkdir "APK"
copy /y "mobile-app\android\app\build\outputs\apk\debug\app-debug.apk" "APK\Smart-Finance-debug.apk" >nul || goto :erro

echo.
echo APK criado com sucesso:
echo %~dp0APK\Smart-Finance-debug.apk
start "" "%~dp0APK"
pause
exit /b 0

:erro
echo.
echo ERRO: O APK nao foi gerado.
echo Abra o projeto no Android Studio para instalar SDK ou JDK solicitados.
pause
exit /b 1
