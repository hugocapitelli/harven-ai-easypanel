@echo off
REM ============================================
REM HARVEN.AI - INICIAR FRONTEND (SEM DOCKER)
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Iniciar Frontend
echo ========================================
echo.

cd harven.ai-platform-mockup

echo [INFO] Verificando dependencias...
if not exist "node_modules" (
    echo [AVISO] node_modules nao encontrado. Instalando...
    call npm install
)

echo.
echo [OK] Iniciando servidor frontend...
echo [INFO] Aplicacao estara disponivel em: http://localhost:3000
echo.
echo [DICA] Para parar: Pressione Ctrl+C
echo.

call npm run dev
