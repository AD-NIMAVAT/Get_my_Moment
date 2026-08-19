@echo off
title Get My Moment - Public Secure HTTPS Tunnel
echo ========================================================
echo   Get My Moment - Live Public HTTPS Tunnel
echo   Connecting Mobile App and Remote Devices securely...
echo ========================================================
echo.

set PATH=C:\Users\Himalaya\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;%PATH%

echo Starting Secure HTTPS Tunnel on Port 8000...
echo.
cmd /c "npx localtunnel --port 8000"

pause
