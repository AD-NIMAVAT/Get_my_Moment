@echo off
title Get My Moment - FastAPI Backend (:8000)
echo ===================================================
echo Starting Get My Moment FastAPI Backend on port 8000...
echo ===================================================
cd /d "%~dp0"
call .venv\Scripts\activate
python -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload
pause
