@echo off
REM ============================================
REM HARVEN.AI - PARAR TODOS OS PROCESSOS
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Parar Todos Processos
echo ========================================
echo.

echo [INFO] Parando processos na porta 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo   Matando processo: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [INFO] Parando processos na porta 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo   Matando processo: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [INFO] Parando processos Python (uvicorn, fastapi)...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM py.exe 2>nul

echo.
echo [INFO] Parando processos Node (npm, vite)...
taskkill /F /IM node.exe 2>nul

echo.
echo [OK] Todos os processos parados!
echo.
echo [DICA] Agora execute: INICIAR_BACKEND.bat e INICIAR_FRONTEND.bat
echo.
pause
