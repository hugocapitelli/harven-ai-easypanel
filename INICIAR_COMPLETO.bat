@echo off
REM ============================================
REM HARVEN.AI - INICIAR COMPLETO (PARA + INICIA)
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Inicializacao Completa
echo ========================================
echo.

REM PASSO 1: PARAR TUDO
echo [PASSO 1/3] Parando processos antigos...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul
taskkill /F /IM python.exe 2>nul
taskkill /F /IM py.exe 2>nul
taskkill /F /IM node.exe 2>nul

timeout /t 2 /nobreak >nul
echo [OK] Processos antigos parados
echo.

REM PASSO 2: INICIAR BACKEND
echo [PASSO 2/3] Iniciando Backend (porta 8000)...
echo.

start "HARVEN - Backend API" cmd /k "cd /d "%~dp0backend" && echo [INFO] Iniciando servidor FastAPI... && echo [INFO] API estara em: http://localhost:8000 && echo. && py main.py"

echo [INFO] Aguardando backend inicializar (5 segundos)...
timeout /t 5 /nobreak >nul
echo [OK] Backend iniciado!
echo.

REM PASSO 3: INICIAR FRONTEND
echo [PASSO 3/3] Iniciando Frontend (porta 3000)...
echo.

start "HARVEN - Frontend React" cmd /k "cd /d "%~dp0harven.ai-platform-mockup" && echo [INFO] Iniciando Vite dev server... && echo [INFO] Aplicacao estara em: http://localhost:3000 && echo. && npm run dev"

echo.
echo ========================================
echo   Plataforma Iniciada com Sucesso!
echo ========================================
echo.
echo Backend API:  http://localhost:8000
echo Frontend App: http://localhost:3000
echo API Docs:     http://localhost:8000/docs
echo.
echo [IMPORTANTE] Aguarde 10-15 segundos antes de acessar!
echo.
echo [DICA] Para testar API:
echo   curl http://localhost:8000/health
echo   curl http://localhost:8000/api/ai/status
echo.
pause
