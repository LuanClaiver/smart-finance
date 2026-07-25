@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Reparar Smart Finance
set "ROOT=%~dp0"
echo Esta acao recria somente o ambiente Python.
echo Seu banco backend\data\smart_finance.db nao sera apagado.
echo.
choice /C SN /N /M "Continuar? [S/N]: "
if errorlevel 2 exit /b 0
if exist "%ROOT%backend\.venv" rmdir /s /q "%ROOT%backend\.venv"
call "%ROOT%Preparar Smart Finance.bat"
exit /b %errorlevel%
