@echo off
echo Cerrando Chrome...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

echo Iniciando Chrome con debugging en puerto 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 https://www.mixamo.com/

echo.
echo Chrome iniciado con debugging habilitado.
echo Ahora puedes usar Claude Code para automatizar Mixamo.
echo.
pause
