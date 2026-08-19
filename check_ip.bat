@echo off
title Get My Moment - Network IP Checker
cls
echo ========================================================
echo   Get My Moment - Mobile Connection Helper
echo ========================================================
echo.
echo Detecting active network IP addresses...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' } | ForEach-Object { Write-Host '  [' $_.InterfaceAlias '] -> http://' $_.IPAddress ':8000/api/v1' -ForegroundColor Green }"

echo.
echo ========================================================
echo  Copy the green URL above and paste it into your
echo  Mobile App under 'Configure Backend Server IP'!
echo ========================================================
echo.
pause
