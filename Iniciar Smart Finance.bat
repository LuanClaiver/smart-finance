@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Smart Finance 0.2.6
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "READY=%VENV%\.smart-finance-ready-0.2.6"
set "READY_PREVIOUS=%VENV%\.smart-finance-ready-0.2.1"
set "DATABASE=%BACKEND%\data\smart_finance.db"
set "PYTHONUTF8=1"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"

cd /d "%ROOT%" || goto :path_error

if not exist "%FRONTEND%\dist\index.html" goto :frontend_error
if not exist "%DATABASE%" (
  echo ATENCAO: backend\data\smart_finance.db nao foi encontrado.
  echo Execute Restaurar Banco Salvo.bat antes de continuar.
  pause
  exit /b 2
)

if not exist "%PYTHON%" goto :prepare
if exist "%READY%" goto :start
if exist "%READY_PREVIOUS%" (
  >"%READY%" echo Smart Finance 0.2.6 reutilizando ambiente 0.2.1 em %date% %time%
  goto :start
)
goto :prepare

:prepare
echo O ambiente ainda nao foi preparado para esta versao.
echo A preparacao sera feita uma unica vez.
echo.
call "%ROOT%Preparar Smart Finance.bat"
if errorlevel 1 exit /b 1

:start
echo ================================================
echo          SMART FINANCE 0.2.6 - RAPIDO
echo ================================================
echo.
echo Computador: http://localhost:8000
echo Rede local: http://IP-DO-COMPUTADOR:8000
echo Hostname:    http://smartfinance.local:8000
echo.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:8000/api/health'; for($i=0; $i -lt 80; $i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if($r.StatusCode -eq 200){ Start-Process 'http://localhost:8000'; exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }"

pushd "%BACKEND%"
"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
set "EXITCODE=%ERRORLEVEL%"
popd
if not "%EXITCODE%"=="0" goto :server_error
exit /b 0

:frontend_error
echo ERRO: a interface compilada nao foi encontrada.
echo Extraia novamente o ZIP completo.
pause
exit /b 1
:path_error
echo ERRO: nao foi possivel acessar a pasta do Smart Finance.
pause
exit /b 1
:server_error
echo.
echo ERRO: o servidor foi encerrado inesperadamente. Codigo: %EXITCODE%
echo Execute Reparar Smart Finance.bat se o problema persistir.
pause
exit /b %EXITCODE%
