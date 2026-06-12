$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

Write-Host "Propagacao Digital - verificando projeto..."

if (!(Test-Path -LiteralPath ".\index.html")) {
  throw "index.html nao encontrado. Execute este script dentro da pasta propagacao-digital."
}

if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx nao encontrado. Instale/ative Node.js antes do deploy."
}

Write-Host "Build local..."
cmd /c npm run build
if ($LASTEXITCODE -ne 0) {
  throw "Build falhou."
}

Write-Host "Verificando login da Vercel..."
cmd /c npx vercel whoami
if ($LASTEXITCODE -ne 0) {
  throw "Login da Vercel invalido. Rode: npx vercel login"
}

Write-Host "Publicando em producao..."
cmd /c npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
  throw "Deploy na Vercel falhou."
}

Write-Host "Deploy finalizado."
