@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>&1 || (
  echo ERRO: Git nao foi encontrado.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Execute primeiro "Enviar para GitHub.bat".
  pause
  exit /b 1
)

set /p MESSAGE=Descricao da atualizacao: 
if "%MESSAGE%"=="" set "MESSAGE=Atualizacao do Smart Finance"

git add .
git commit -m "%MESSAGE%"
if errorlevel 1 (
  echo Nenhuma alteracao nova para enviar.
  pause
  exit /b 0
)

git push
if errorlevel 1 (
  echo ERRO ao enviar a atualizacao.
  pause
  exit /b 1
)

echo Atualizacao enviada. O workflow de APK sera iniciado automaticamente se o mobile-app mudou.
pause
