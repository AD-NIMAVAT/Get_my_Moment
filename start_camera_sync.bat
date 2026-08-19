@echo off
title Get My Moment - Wireless Camera Live Sync Bridge
cls
echo ======================================================================
echo           GET MY MOMENT - WIRELESS CAMERA LIVE SYNC BRIDGE
echo ======================================================================
echo.
set /p EVENT_ID="Enter Event ID (from Dashboard URL): "
if "%EVENT_ID%"=="" (
    echo Error: Event ID cannot be empty!
    pause
    exit /b 1
)

echo.
echo Starting Camera Wi-Fi Bridge for Event: %EVENT_ID%...
& ".venv\Scripts\python.exe" scripts\local_camera_bridge.py --event %EVENT_ID% --api https://web-production-08582.up.railway.app/api/v1
pause
