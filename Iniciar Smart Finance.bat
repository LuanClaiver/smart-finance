@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Smart Finance 0.5.3

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

rem O ambiente Python fica fora da pasta do programa para evitar o erro
rem "O nome do arquivo ou a extensao e muito grande" do Windows.
set "SF_HOME=%LOCALAPPDATA%\SmartFinance"
set "VENV=%SF_HOME%\PythonEnv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "READY=%SF_HOME%\ambiente-pronto-0.5.3.txt"
set "PIP_CACHE_DIR=%SF_HOME%\pip-cache"
set "PYTHONUTF8=1"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"
set "SMART_FINANCE_MANAGED_LAUNCH=1"

cd /d "%ROOT%" || goto :path_error

if not exist "%BACKEND%\requirements.txt" goto :files_error
if not exist "%FRONTEND%\dist\index.html" goto :files_error
if not exist "%SF_HOME%" mkdir "%SF_HOME%" >nul 2>&1

if not exist "%PYTHON%" goto :prepare
if not exist "%READY%" goto :prepare
"%PYTHON%" -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 || goto :prepare
goto :start

:prepare
echo ================================================
echo       PREPARANDO SMART FINANCE 0.5.3
echo ================================================
echo O ambiente sera criado em uma pasta curta do Windows:
echo %VENV%
echo.

set "PY_CMD="
where py >nul 2>&1 && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python >nul 2>&1 || goto :python_error
  set "PY_CMD=python"
)

%PY_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" || goto :python_version_error

if exist "%VENV%" (
  "%PYTHON%" -c "import sys" >nul 2>&1 || (
    echo Removendo ambiente incompleto...
    rmdir /s /q "%VENV%"
  )
)

if not exist "%PYTHON%" (
  echo [1/3] Criando ambiente Python em caminho curto...
  %PY_CMD% -m venv "%VENV%" || goto :prepare_error
) else (
  echo [1/3] Ambiente Python encontrado.
)

echo [2/3] Instalando dependencias...
"%PYTHON%" -m pip install --upgrade --index-url https://pypi.org/simple -r "%BACKEND%\requirements.txt" || goto :prepare_error

echo [3/3] Validando dependencias principais...
"%PYTHON%" -c "import fastapi, uvicorn, sqlalchemy, reportlab, email_validator, dotenv, multipart" || goto :prepare_error

rem Zeroconf e opcional. Falha nele nao impede o sistema de funcionar por localhost ou IP.
"%PYTHON%" -c "import zeroconf" >nul 2>&1
if errorlevel 1 echo AVISO: descoberta automatica smartfinance.local indisponivel. Use localhost ou o IP do computador.

>"%READY%" echo Smart Finance 0.5.3 preparado em %date% %time%
echo.
echo Preparacao concluida.
echo.

:start
if not exist "%BACKEND%\data" mkdir "%BACKEND%\data"
if not exist "%BACKEND%\storage" mkdir "%BACKEND%\storage"
if not exist "%BACKEND%\backups" mkdir "%BACKEND%\backups"

echo ================================================
echo            SMART FINANCE 0.5.3
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

:serve
pushd "%BACKEND%"
"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
set "EXITCODE=%ERRORLEVEL%"
popd

if "%EXITCODE%"=="75" (
  echo.
  echo [Banco] Reiniciando para concluir a importacao...
  timeout /t 1 /nobreak >nul
  goto :serve
)

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
echo.
echo ERRO: Nao foi possivel preparar as dependencias do programa.
echo Execute Reparar ambiente em Ferramentas e Manutencao.
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
