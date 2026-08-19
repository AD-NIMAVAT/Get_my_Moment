@echo off
title Get My Moment - Expo Mobile App
echo ========================================================
echo   Starting Get My Moment Mobile App (Expo SDK 51)
echo   iOS & Android Universal Companion & Guest Portal
echo ========================================================
echo.

set PATH=C:\Users\Himalaya\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;%PATH%

cd /d "d:\Get_my_moment\apps\mobile"

if not exist node_modules (
    echo Installing Mobile dependencies...
    cmd /c "npm install"
)

echo Starting Expo Development Server...
cmd /c "npx expo start"
pause
