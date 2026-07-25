@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0mobile-app"
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
if not exist "android\gradlew.bat" (
  echo O projeto Android ainda nao foi criado.
  echo Execute primeiro "Preparar APK.bat".
  pause
  exit /b 1
)
echo Gerando as assinaturas do projeto...
cd android
call gradlew.bat signingReport
if errorlevel 1 (
  echo.
  echo Nao foi possivel executar o Gradle. Abra o Android Studio uma vez e instale o SDK solicitado.
)
echo.
echo Procure no resultado por Variant: debug e copie o SHA1.
pause
