@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Smart Finance 0.3.5

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "READY=%VENV%\.smart-finance-ready-0.3.5"
set "PYTHONUTF8=1"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"

cd /d "%ROOT%" || goto :path_error

if not exist "%BACKEND%\requirements.txt" goto :files_error
if not exist "%FRONTEND%\dist\index.html" goto :files_error

if not exist "%PYTHON%" goto :prepare
if not exist "%READY%" goto :prepare
goto :start

:prepare
echo ================================================
echo       PREPARANDO SMART FINANCE 0.3.5
echo ================================================
echo Esta etapa ocorre apenas na primeira abertura ou apos um reparo.
echo.

set "PY_CMD="
where py >nul 2>&1 && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python >nul 2>&1 || goto :python_error
  set "PY_CMD=python"
)

%PY_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" || goto :python_version_error

if not exist "%PYTHON%" (
  echo [1/3] Criando ambiente Python...
  %PY_CMD% -m venv "%VENV%" || goto :prepare_error
) else (
  echo [1/3] Ambiente Python encontrado.
)

echo [2/3] Instalando dependencias...
"%PYTHON%" -m pip install --upgrade --index-url https://pypi.org/simple -r "%BACKEND%\requirements.txt" || goto :prepare_error

echo [3/3] Validando ambiente...
"%PYTHON%" -c "import fastapi, uvicorn, sqlalchemy, reportlab, zeroconf, email_validator, dotenv, multipart" || goto :prepare_error
>"%READY%" echo Smart Finance 0.3.5 preparado em %date% %time%
echo.
echo Preparacao concluida.
echo.

:start
if not exist "%BACKEND%\data" mkdir "%BACKEND%\data"
if not exist "%BACKEND%\storage" mkdir "%BACKEND%\storage"
if not exist "%BACKEND%\backups" mkdir "%BACKEND%\backups"

echo ================================================
echo            SMART FINANCE 0.3.5
echo ================================================
echo.
echo Computador: http://localhost:8000
echo Rede local: http://IP-DO-COMPUTADOR:8000
echo.
echo Na primeira abertura, caso nao exista banco, sera criada a conta:
echo   Usuario: Admin
echo   Senha:   1234
echo.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:8000/api/health'; for($i=0; $i -lt 100; $i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if($r.StatusCode -eq 200){ Start-Process 'http://localhost:8000'; exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }"

pushd "%BACKEND%"
"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
set "EXITCODE=%ERRORLEVEL%"
popd
if not "%EXITCODE%"=="0" goto :server_error
exit /b 0

:python_error
echo ERRO: Python nao foi encontrado.
echo Instale Python 3.11 ou superior e marque a opcao para adicionar ao PATH.
goto :fail
:python_version_error
echo ERRO: O Python instalado e anterior a versao 3.11.
goto :fail
:prepare_error
echo ERRO: Nao foi possivel preparar as dependencias do programa.
echo Verifique a internet e execute novamente.
goto :fail
:files_error
echo ERRO: Os arquivos internos do Smart Finance estao incompletos.
echo Extraia novamente o pacote completo.
goto :fail
:path_error
echo ERRO: Nao foi possivel acessar a pasta do Smart Finance.
goto :fail
:server_error
echo.
echo ERRO: O servidor foi encerrado. Codigo: %EXITCODE%
echo Use a opcao Reparar ambiente dentro de Ferramentas e Manutencao.
:fail
pause
exit /b 1
