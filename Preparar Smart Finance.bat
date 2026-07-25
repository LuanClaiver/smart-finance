@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Preparar Smart Finance 0.2.6
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "READY=%VENV%\.smart-finance-ready-0.2.6"
set "PYTHONUTF8=1"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"

cd /d "%ROOT%" || goto :path_error

echo ================================================
echo       PREPARAR SMART FINANCE 0.2.6
echo ================================================
echo.

if not exist "%BACKEND%\requirements.txt" goto :requirements_error
if not exist "%FRONTEND%\dist\index.html" goto :frontend_error
set "PY_CMD="
where py >nul 2>&1 && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python >nul 2>&1 || goto :python_error
  set "PY_CMD=python"
)
%PY_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" || goto :python_version_error

if not exist "%PYTHON%" (
  echo [1/3] Criando ambiente Python...
  %PY_CMD% -m venv "%VENV%" || goto :venv_error
) else (
  echo [1/3] Ambiente Python encontrado.
)

echo [2/3] Instalando dependencias necessarias...
"%PYTHON%" -m pip install --upgrade --index-url https://pypi.org/simple -r "%BACKEND%\requirements.txt" || goto :dependency_error

echo [3/3] Validando ambiente...
"%PYTHON%" -c "import fastapi, uvicorn, sqlalchemy, reportlab, zeroconf, email_validator, dotenv, multipart; assert sqlalchemy.__version__ == '2.0.51'" || goto :dependency_error
>"%READY%" echo Smart Finance 0.2.6 preparado em %date% %time%

echo.
echo Ambiente preparado com sucesso.
echo Nas proximas aberturas use apenas:
echo   Iniciar Smart Finance.bat
echo.
pause
exit /b 0

:requirements_error
echo ERRO: backend\requirements.txt nao foi encontrado.
goto :fail
:frontend_error
echo ERRO: frontend\dist\index.html nao foi encontrado.
goto :fail
:python_error
echo ERRO: Python nao encontrado. Instale Python 3.11 ou superior.
goto :fail
:python_version_error
echo ERRO: a versao instalada do Python e anterior a 3.11.
goto :fail
:venv_error
echo ERRO: nao foi possivel criar o ambiente virtual.
goto :fail
:dependency_error
echo ERRO: nao foi possivel instalar ou validar as dependencias.
goto :fail
:path_error
echo ERRO: nao foi possivel acessar a pasta do Smart Finance.
:fail
pause
exit /b 1
