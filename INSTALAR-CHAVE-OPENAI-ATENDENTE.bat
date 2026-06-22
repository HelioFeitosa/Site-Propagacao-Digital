@echo off
setlocal
cd /d "%~dp0"

echo Instalando chave OpenAI do Atendente Inteligente...
echo.
echo Requisito: copie a chave nova da OpenAI antes de executar este arquivo.
echo A chave nao sera exibida nesta tela.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$key = Get-Clipboard -Raw -ErrorAction SilentlyContinue; if(-not ($key -match '^sk-')) { Write-Host 'ERRO: clipboard nao contem uma chave OpenAI valida.'; exit 2 }; $key.Trim() | Set-Content -NoNewline -Encoding ascii '.openai-key.tmp'"
if errorlevel 1 goto fail

cmd /c vercel env rm OPENAI_API_KEY production --yes --scope heliofeitosa72-3091s-projects >nul 2>nul
type .openai-key.tmp | cmd /c vercel env add OPENAI_API_KEY production --scope heliofeitosa72-3091s-projects
if errorlevel 1 goto cleanup_fail

cmd /c vercel env rm OPENAI_MODEL production --yes --scope heliofeitosa72-3091s-projects >nul 2>nul
echo gpt-5-mini | cmd /c vercel env add OPENAI_MODEL production --scope heliofeitosa72-3091s-projects
if errorlevel 1 goto cleanup_fail

del .openai-key.tmp >nul 2>nul

set VERCEL_TELEMETRY_DISABLED=1
cmd /c vercel deploy --prod --yes --scope heliofeitosa72-3091s-projects
if errorlevel 1 goto fail

echo.
echo OK: chave instalada e site publicado.
echo Agora rode o teste no site: https://propagacao-digital.vercel.app
pause
exit /b 0

:cleanup_fail
del .openai-key.tmp >nul 2>nul
:fail
echo.
echo ERRO: nao foi possivel instalar a chave automaticamente.
echo Confirme se a chave foi copiada e se o Vercel CLI esta logado.
pause
exit /b 1
