@echo off
REM ============================================
REM HARVEN.AI - REINICIAR TUDO
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Reiniciar Plataforma
echo ========================================
echo.

echo [INFO] Parando processos antigos...

REM Matar processos Python na porta 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul

REM Matar processos Node na porta 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul

timeout /t 2 /nobreak >nul

echo [OK] Processos antigos parados
echo.
echo [INFO] Iniciando backend atualizado...
echo.

REM Iniciar backend em nova janela
start "HARVEN - Backend" cmd /k "cd backend && py main.py"

timeout /t 5 /nobreak >nul

echo [OK] Backend iniciado em nova janela
echo.
echo [INFO] Iniciando frontend atualizado...
echo.

REM Iniciar frontend em nova janela
start "HARVEN - Frontend" cmd /k "cd harven.ai-platform-mockup && npm run dev"

echo.
echo ========================================
echo   Plataforma Reiniciada!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo [DICA] Aguarde 10 segundos e acesse: http://localhost:3000
echo.
pause
