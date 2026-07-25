@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Restaurar banco - Smart Finance
set "ROOT=%~dp0"
set "TARGET=%ROOT%backend\data\smart_finance.db"
set "BACKUPDIR=%ROOT%backend\backups"
set "SOURCE=%~1"

cd /d "%ROOT%" || goto :path_error

echo ================================================
echo        RESTAURAR BANCO DO SMART FINANCE
echo ================================================
echo.

if not defined SOURCE (
  echo Voce pode arrastar o arquivo smart_finance.db para cima deste BAT.
  echo Ou informe abaixo o caminho completo do banco salvo.
  echo.
  set /p "SOURCE=Caminho do smart_finance.db: "
  set "SOURCE=%SOURCE:"=%"
)

if not defined SOURCE goto :source_error
if not exist "%SOURCE%" goto :source_error

for %%F in ("%SOURCE%") do set "FILENAME=%%~nxF"
if /I not "%FILENAME%"=="smart_finance.db" (
  echo.
  echo AVISO: O arquivo selecionado se chama "%FILENAME%".
  choice /C SN /N /M "Deseja usa-lo mesmo assim? [S/N]: "
  if errorlevel 2 exit /b 2
)

if not exist "%ROOT%backend\data" mkdir "%ROOT%backend\data"
if not exist "%BACKUPDIR%" mkdir "%BACKUPDIR%"

if exist "%TARGET%" (
  for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set "DATESTAMP=%%d-%%c-%%b"
  for /f "tokens=1-3 delims=:,. " %%a in ("%time%") do set "TIMESTAMP=%%a%%b%%c"
  set "TIMESTAMP=%TIMESTAMP: =0%"
  copy /y "%TARGET%" "%BACKUPDIR%\antes-da-restauracao-%DATESTAMP%-%TIMESTAMP%.db" >nul
  if errorlevel 1 goto :copy_error
  echo Uma copia do banco anterior foi criada em backend\backups.
)

copy /y "%SOURCE%" "%TARGET%" >nul
if errorlevel 1 goto :copy_error

echo.
echo Banco restaurado com sucesso em:
echo   backend\data\smart_finance.db
echo.
echo Agora execute: Iniciar Smart Finance.bat
pause
exit /b 0

:source_error
echo.
echo ERRO: O arquivo informado nao foi encontrado.
echo Execute novamente e selecione seu smart_finance.db salvo.
pause
exit /b 1

:copy_error
echo.
echo ERRO: Nao foi possivel copiar o banco.
echo Feche o Smart Finance e verifique se o arquivo nao esta em uso.
pause
exit /b 1

:path_error
echo ERRO: Nao foi possivel acessar a pasta do Smart Finance.
pause
exit /b 1
