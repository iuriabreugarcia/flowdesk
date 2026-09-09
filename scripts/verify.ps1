$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "== Backend tests ==" -ForegroundColor Cyan
Push-Location "$Root\backend\FlowDesk.Api.Tests"
dotnet restore
dotnet test -c Release
Pop-Location

Write-Host "== Frontend tests ==" -ForegroundColor Cyan
Push-Location "$Root\frontend\flowdesk-web"
npm install
npm test -- --no-progress
npm run build
Pop-Location

Write-Host "Validação local concluída." -ForegroundColor Green
