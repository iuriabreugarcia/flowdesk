# Estratégia de testes

## Backend

O projeto de testes fica em:

```text
backend/FlowDesk.Api.Tests
```

Execute:

```powershell
cd backend\FlowDesk.Api.Tests
dotnet test -c Release
```

Os primeiros testes cobrem a regra de precificação dos itens de OS: quantidade, arredondamento monetário e desconto.

## Frontend

Execute:

```powershell
cd frontend\flowdesk-web
npm test
```

Os primeiros specs cobrem cálculo de item no formulário e autorização por role.

## Verificação completa

Na raiz:

```powershell
.\scripts\verify.ps1
```

## Smoke test da stack

Com Docker já iniciado:

```powershell
.\scripts\smoke.ps1
```

O script valida frontend, health da API, login JWT e endpoints autenticados de clientes, ordens, produtos e relatórios.
