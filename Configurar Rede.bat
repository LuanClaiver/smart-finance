@echo off
chcp 65001 >nul
net session >nul 2>&1
if errorlevel 1 (
  echo Este arquivo precisa ser executado como administrador.
  echo Clique com o botao direito e escolha Executar como administrador.
  pause
  exit /b 1
)
netsh advfirewall firewall delete rule name="Smart Finance HTTP" >nul 2>&1
netsh advfirewall firewall add rule name="Smart Finance HTTP" dir=in action=allow protocol=TCP localport=8000 profile=private
netsh advfirewall firewall delete rule name="Smart Finance Vite" >nul 2>&1
netsh advfirewall firewall add rule name="Smart Finance Vite" dir=in action=allow protocol=TCP localport=5173 profile=private
netsh advfirewall firewall delete rule name="Smart Finance mDNS" >nul 2>&1
netsh advfirewall firewall add rule name="Smart Finance mDNS" dir=in action=allow protocol=UDP localport=5353 profile=private
echo.
echo Regras criadas. Confirme que a rede do Windows esta como Privada.
pause
