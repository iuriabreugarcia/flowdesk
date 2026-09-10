param(
    [string]$ApiBase = "http://localhost:5080",
    [string]$WebBase = "http://localhost:8080",
    [string]$Email = "admin@flowdesk.dev",
    [string]$Password = "FlowDesk@123"
)

$ErrorActionPreference = "Stop"

function Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

Write-Host "FlowDesk smoke test" -ForegroundColor Cyan

$health = Invoke-RestMethod "$ApiBase/api/health"
if ($health.status -ne "ok") { throw "Health check da API falhou." }
Ok "API health"

$webHealth = Invoke-WebRequest "$WebBase/healthz" -UseBasicParsing
if ($webHealth.StatusCode -ne 200 -or $webHealth.Content.Trim() -ne "ok") {
    throw "Health check do frontend falhou."
}
Ok "Frontend health"

$web = Invoke-WebRequest $WebBase -UseBasicParsing
if ($web.StatusCode -ne 200) { throw "Frontend nao respondeu 200." }
Ok "Frontend HTTP 200"

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$session = Invoke-RestMethod "$ApiBase/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
if (-not $session.accessToken) { throw "Login nao retornou JWT." }
Ok "Login JWT"

$headers = @{ Authorization = "Bearer $($session.accessToken)" }

$customers = Invoke-RestMethod "$ApiBase/api/customers?page=1&pageSize=5" -Headers $headers
Ok "Clientes autenticados"

$orders = Invoke-RestMethod "$ApiBase/api/orders" -Headers $headers
Ok "Ordens autenticadas"

$products = Invoke-RestMethod "$ApiBase/api/products?page=1&pageSize=5" -Headers $headers
Ok "Produtos autenticados"

$reports = Invoke-RestMethod "$ApiBase/api/reports/overview?range=30d" -Headers $headers
Ok "Relatorios autenticados"

Write-Host "Smoke test concluido com sucesso." -ForegroundColor Green
