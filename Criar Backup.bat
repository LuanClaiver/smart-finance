@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0"
set "PYTHON=%ROOT%backend\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Execute primeiro Iniciar Smart Finance.bat.
  pause
  exit /b 1
)
pushd "%ROOT%backend"
"%PYTHON%" create_backup.py
popd
pause
