@echo off
title Get My Moment - Restart All Services
echo ===================================================
echo 🔄 Restarting Get My Moment Services...
echo ===================================================

echo [1/3] Stopping existing processes on ports 8000 and 3000...
powershell -Command "Get-NetTCPConnection -LocalPort 8000,3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [2/3] Starting FastAPI Backend on port 8000...
start "Get My Moment - Backend (:8000)" cmd /k "%~dp0start_backend.bat"

echo [3/3] Starting Next.js Web Frontend on port 3000...
start "Get My Moment - Frontend (:3000)" cmd /k "%~dp0start_frontend.bat"

echo ===================================================
echo ✅ All services restarted successfully!
echo 🌐 Frontend: http://localhost:3000
echo 🔌 Backend:  http://localhost:8000
echo ===================================================
timeout /t 3 >nul
exit
