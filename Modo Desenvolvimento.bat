@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0"
call "%ROOT%scripts\Preparar Ambiente.bat" || exit /b 1
start "Smart Finance - Backend" cmd /k call "%ROOT%scripts\Backend Dev.bat"
start "Smart Finance - Frontend" cmd /k call "%ROOT%scripts\Frontend Dev.bat"
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:5173'"
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
