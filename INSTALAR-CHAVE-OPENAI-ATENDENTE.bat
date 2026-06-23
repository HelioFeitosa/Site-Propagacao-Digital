@echo off
setlocal
cd /d "%~dp0"

echo Instalando chave OpenAI do Atendente Inteligente...
echo.
echo Requisito: copie a chave nova da OpenAI antes de executar este arquivo.
echo A chave nao sera exibida nesta tela.
echo.

cmd /c node scripts\install-openai-key.js
if errorlevel 1 goto fail

echo.
echo OK: chave instalada e site publicado.
echo Agora rode o teste no site: https://propagacaodigital.com
pause
exit /b 0

:fail
echo.
echo ERRO: nao foi possivel instalar a chave automaticamente.
echo Confirme se a chave foi copiada e se o Vercel CLI esta logado.
pause
exit /b 1
