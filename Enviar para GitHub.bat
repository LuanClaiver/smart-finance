@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================
echo       SMART FINANCE - ENVIAR AO GITHUB
echo ================================================
echo.

where git >nul 2>&1 || (
  echo ERRO: Git nao foi encontrado.
  echo Instale o Git for Windows e tente novamente.
  pause
  exit /b 1
)

set /p REPO_URL=Cole a URL HTTPS do repositorio vazio: 
if "%REPO_URL%"=="" (
  echo Nenhuma URL informada.
  pause
  exit /b 1
)

if not exist ".git" git init

git config user.name >nul 2>&1
if errorlevel 1 (
  set /p GIT_NAME=Seu nome para os commits: 
  git config user.name "%GIT_NAME%"
)

git config user.email >nul 2>&1
if errorlevel 1 (
  set /p GIT_EMAIL=Seu e-mail do GitHub: 
  git config user.email "%GIT_EMAIL%"
)

git branch -M main
git add .
git commit -m "Smart Finance com compilacao APK no GitHub" 2>nul

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)

echo.
echo Enviando arquivos. O Git pode abrir o navegador para autenticar sua conta...
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERRO ao enviar. Confira a URL, sua conexao e a autenticacao do GitHub.
  pause
  exit /b 1
)

echo.
echo Projeto enviado com sucesso.
echo Agora configure Variables e Secrets na pagina do repositorio.
pause
