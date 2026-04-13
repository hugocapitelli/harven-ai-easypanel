@echo off
REM ============================================
REM HARVEN.AI - INICIAR BACKEND (SEM DOCKER)
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Iniciar Backend
echo ========================================
echo.

cd backend

echo [INFO] Verificando dependencias...
py -c "import fastapi" 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Dependencias nao encontradas. Instalando...
    py -m pip install -r requirements.txt
)

echo.
echo [OK] Iniciando servidor backend...
echo [INFO] API estara disponivel em: http://localhost:8000
echo [INFO] Documentacao da API: http://localhost:8000/docs
echo.
echo [DICA] Para parar: Pressione Ctrl+C
echo.

py main.py
