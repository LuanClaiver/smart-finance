@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizar GitHub - Smart Finance
cd /d "%~dp0" || goto :fail
if not exist ".git" (
  echo Esta pasta ainda nao esta conectada ao GitHub.
  echo Execute primeiro ENVIAR REPOSITORIO COMPLETO.bat.
  pause
  exit /b 1
)

set "MESSAGE=Atualizar Smart Finance"
set /p "CUSTOM_MESSAGE=Descricao da atualizacao [Enter para usar a padrao]: "
if defined CUSTOM_MESSAGE set "MESSAGE=!CUSTOM_MESSAGE!"

git add -A || goto :fail
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao foi encontrada.
  pause
  exit /b 0
)
git commit -m "!MESSAGE!" || goto :fail
git push || goto :fail

echo Atualizacao enviada. Acompanhe a geracao do APK na guia Acoes do GitHub.
pause
exit /b 0
:fail
echo ERRO: Nao foi possivel atualizar o GitHub.
pause
exit /b 1
