@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0mobile-app"

echo ================================================
echo        SMART FINANCE - PREPARAR APK
echo ================================================
echo.

where node >nul 2>&1 || (
  echo ERRO: Node.js 22 ou superior nao foi encontrado.
  echo Instale o Node.js e marque a opcao para adicionar ao PATH.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 22 (
  echo ERRO: Esta instalado o Node.js %NODE_MAJOR%, mas o projeto exige Node.js 22 ou superior.
  pause
  exit /b 1
)

if not exist ".env.local" (
  copy /y ".env.example" ".env.local" >nul
  echo AVISO: O login por usuario e senha funcionara.
  echo Para ativar o Google, execute "Configurar Google Login.bat" depois de criar as credenciais.
  echo.
)

if not exist "node_modules\@capacitor\core\package.json" (
  echo [1/5] Instalando dependencias do aplicativo...
  call npm config set registry https://registry.npmjs.org/ >nul
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :erro
) else (
  echo [1/5] Dependencias ja instaladas.
)

echo [2/5] Compilando a interface...
call npm run build
if errorlevel 1 goto :erro

if not exist "android\gradlew.bat" (
  echo [3/5] Criando o projeto Android...
  call npx cap add android
  if errorlevel 1 goto :erro
) else (
  echo [3/5] Projeto Android ja existe.
)

echo [4/5] Sincronizando plugins e arquivos...
call npx cap sync android
if errorlevel 1 goto :erro

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\mobile\Aplicar-Ajustes-Android.ps1" "%cd%\android"
if errorlevel 1 goto :erro

echo [5/5] Preparacao concluida.
echo.
echo Proximos passos:
echo  1. Execute "Ver SHA-1 Google.bat".
echo  2. Configure o Google Cloud.
echo  3. Execute "Configurar Google Login.bat".
echo  4. Execute "Gerar APK Debug.bat".
echo.
pause
exit /b 0

:erro
echo.
echo ERRO: Nao foi possivel preparar o projeto Android.
echo Confira sua internet, Node.js e Android Studio.
pause
exit /b 1
