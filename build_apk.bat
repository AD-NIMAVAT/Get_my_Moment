@echo off
title Get My Moment - Build Android APK
echo ========================================================
echo   Get My Moment - Standalone Android APK Generator
echo   Building Direct Installable APK via EAS Cloud Build
echo ========================================================
echo.

set PATH=C:\Users\Himalaya\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;%PATH%
set EAS_NO_VCS=1

cd /d "d:\Get_my_moment\apps\mobile"

echo Step 1: Checking EAS CLI...
cmd /c "npx -y eas-cli --version"

echo.
echo Step 2: Launching Standalone APK Build...
echo (If prompted, log in with your free Expo account)
echo.
cmd /c "npx -y eas-cli build -p android --profile preview"

pause
