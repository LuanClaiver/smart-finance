@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Enviar repositorio completo - Smart Finance
cd /d "%~dp0" || goto :fail

where git >nul 2>&1 || (
  echo ERRO: Git nao foi encontrado. Instale o Git for Windows.
  pause
  exit /b 1
)

echo ================================================
echo   ENVIAR REPOSITORIO COMPLETO - SMART FINANCE
echo ================================================
echo Este processo preserva o historico remoto e remove do GitHub
 echo os arquivos antigos que nao existem mais nesta pasta limpa.
echo.

if not exist ".git" (
  git init || goto :fail
  git branch -M main
)

for /f "delims=" %%R in ('git remote 2^>nul') do set "HAS_REMOTE=1"
if not defined HAS_REMOTE (
  set /p "REPO_URL=Cole a URL HTTPS do repositorio GitHub: "
  if not defined REPO_URL goto :fail
  git remote add origin "!REPO_URL!" || goto :fail
)

for /f "delims=" %%N in ('git config user.name 2^>nul') do set "GIT_NAME=%%N"
if not defined GIT_NAME (
  set /p "GIT_NAME=Seu nome para os commits: "
  git config user.name "!GIT_NAME!"
)
for /f "delims=" %%E in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%E"
if not defined GIT_EMAIL (
  set /p "GIT_EMAIL=Seu e-mail do GitHub: "
  git config user.email "!GIT_EMAIL!"
)

echo.
echo Sincronizando com o repositorio atual...
git fetch origin main >nul 2>&1
if not errorlevel 1 (
  git reset --mixed origin/main || goto :fail
) else (
  git branch -M main
)

git add -A || goto :fail
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao foi encontrada.
  pause
  exit /b 0
)

set "MESSAGE=Organizar projeto e atualizar Smart Finance 0.3.5"
set /p "CUSTOM_MESSAGE=Descricao do envio [Enter para usar a padrao]: "
if defined CUSTOM_MESSAGE set "MESSAGE=!CUSTOM_MESSAGE!"

git commit -m "!MESSAGE!" || goto :fail
git branch -M main
git push -u origin main || goto :fail

echo.
echo Repositorio completo enviado com sucesso.
echo Os segredos configurados nas Acoes do GitHub continuam preservados.
pause
exit /b 0

:fail
echo.
echo ERRO: O envio nao foi concluido.
echo Leia a mensagem acima e tente novamente.
pause
exit /b 1
