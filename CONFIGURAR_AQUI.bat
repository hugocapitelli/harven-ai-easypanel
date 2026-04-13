@echo off
REM ============================================
REM HARVEN.AI - ABRIR CONFIGURACAO
REM ============================================

echo.
echo ========================================
echo   HARVEN.AI - Configurar Plataforma
echo ========================================
echo.
echo Abrindo arquivo de configuracao (.env)...
echo.
echo INSTRUCOES:
echo 1. Obtenha sua chave OpenAI em:
echo    https://platform.openai.com/api-keys
echo.
echo 2. Substitua "sua-chave-aqui" pela sua chave real
echo    A chave deve comecar com "sk-"
echo.
echo 3. Salve o arquivo (Ctrl+S)
echo.
echo 4. Execute: deploy.bat
echo.
pause

REM Abrir arquivo .env
if exist "backend\.env" (
    start notepad "backend\.env"
) else (
    echo ERRO: Arquivo backend\.env nao encontrado!
    echo Criando a partir do exemplo...
    copy "backend\.env.example" "backend\.env"
    start notepad "backend\.env"
)
