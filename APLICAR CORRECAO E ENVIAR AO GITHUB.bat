@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo =====================================================
echo SMART FINANCE 0.3.3 - CORRECAO DA GERACAO DO APK
echo =====================================================
echo.

if not exist ".git" (
  echo ERRO: Extraia esta atualizacao dentro da pasta do projeto
  echo que ja esta conectada ao GitHub e contem a pasta oculta .git.
  pause
  exit /b 1
)

if not exist ".github\workflows\02-gerar-apk-android.yml" (
  echo ERRO: O fluxo 02-gerar-apk-android.yml nao foi encontrado.
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not defined BRANCH set "BRANCH=main"

echo Ramificacao atual: !BRANCH!
echo Enviando a correcao ao GitHub...

git add -A
if errorlevel 1 goto :erro

git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova foi encontrada.
  echo Abra o GitHub e execute manualmente o fluxo 02 - Gerar APK Android.
  pause
  exit /b 0
)

git commit -m "Corrigir preparacao do ambiente para gerar APK"
if errorlevel 1 goto :erro

git push origin "!BRANCH!"
if errorlevel 1 goto :erro

echo.
echo Correcao enviada com sucesso.
echo O fluxo 02 - Gerar APK Android deve iniciar automaticamente.
echo Abra a guia Acoes do GitHub para acompanhar.
echo.
pause
exit /b 0

:erro
echo.
echo ERRO: Nao foi possivel enviar a correcao.
echo Confira o login do Git e a conexao com a internet.
pause
exit /b 1
