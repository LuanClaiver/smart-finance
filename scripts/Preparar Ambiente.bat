@echo off
setlocal EnableExtensions
set "ROOT=%~dp0..\"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\.venv"
set "PYTHON=%VENV%\Scripts\python.exe"

where py >nul 2>&1 || (echo Python nao encontrado. & exit /b 1)
where npm >nul 2>&1 || (echo Node.js nao encontrado. & exit /b 1)

if not exist "%PYTHON%" (
  py -3 -m venv "%VENV%" || exit /b 1
)

"%PYTHON%" -c "import fastapi, uvicorn, sqlalchemy, reportlab, zeroconf, email_validator, dotenv, multipart" >nul 2>&1
if errorlevel 1 (
  "%PYTHON%" -m pip install --disable-pip-version-check --index-url https://pypi.org/simple -r "%BACKEND%\requirements.txt" || exit /b 1
)

if not exist "%FRONTEND%\node_modules\.bin\vite.cmd" (
  pushd "%FRONTEND%"
  call npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund || (popd & exit /b 1)
  popd
)
exit /b 0
