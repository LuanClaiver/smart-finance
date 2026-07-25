@echo off
setlocal EnableExtensions
set "ROOT=%~dp0..\"
call "%ROOT%scripts\Preparar Ambiente.bat" || exit /b 1
cd /d "%ROOT%frontend"
call npm run build || exit /b 1
echo.
echo Interface compilada em frontend\dist.
pause
