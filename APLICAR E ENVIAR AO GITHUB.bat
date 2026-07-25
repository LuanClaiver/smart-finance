@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================
echo SMART FINANCE - REMOVER LOGIN GOOGLE
echo ================================================
echo.

if not exist ".git" (
  echo ERRO: Esta atualizacao deve ser extraida dentro da pasta do projeto
  echo que ja foi enviada ao GitHub e contem a pasta oculta .git.
  pause
  exit /b 1
)

if not exist "mobile-app\package.json" (
  echo ERRO: Pasta mobile-app nao encontrada.
  pause
  exit /b 1
)

echo Removendo arquivos antigos do login Google...
del /q "mobile-app\src\services\mobile\google.ts" 2>nul
del /q "mobile-app\.env.example" 2>nul
del /q "mobile-app\.env.local" 2>nul
del /q "Configurar Google Login.bat" 2>nul
del /q "Ver SHA-1 Google.bat" 2>nul
del /q "docs\APK_E_GOOGLE_LOGIN.md" 2>nul

echo Enviando alteracoes ao GitHub...
git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova foi encontrada.
  pause
  exit /b 0
)

git commit -m "Remover login Google e gerar APK com login local"
if errorlevel 1 goto :erro

git push origin main
if errorlevel 1 goto :erro

echo.
echo Atualizacao enviada com sucesso.
echo O GitHub deve iniciar automaticamente o fluxo 02 - Gerar APK Android.
echo.
pause
exit /b 0

:erro
echo.
echo ERRO: Nao foi possivel enviar a atualizacao.
echo Execute Atualizar GitHub.bat ou confira o login do Git.
pause
exit /b 1
