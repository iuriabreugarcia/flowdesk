# Arquitetura do FlowDesk

## Visão geral

```text
Angular 17
  ├─ Standalone Components
  ├─ Signals + RxJS
  ├─ Route Guards / RBAC
  ├─ HTTP Interceptors
  ├─ Theme / Feedback globais
  └─ Angular CDK (Kanban)
        │
        │ REST / JWT
        ▼
ASP.NET Core 8 Web API
  ├─ Controllers por feature
  ├─ JWT Authentication
  ├─ Policies / Roles
  ├─ Multi-tenant por companyId
  ├─ EF Core 8
  └─ Migrations
        │
        ▼
PostgreSQL 16
```

## Organização do frontend

```text
src/app
├─ core
│  ├─ auth
│  ├─ config
│  ├─ feedback
│  ├─ http
│  └─ theme
├─ shared
│  └─ feedback
├─ layout
│  └─ shell
└─ features
   ├─ auth
   ├─ customers
   ├─ dashboard
   ├─ errors
   ├─ inventory
   ├─ orders
   ├─ products
   ├─ reports
   └─ team
```

`core` concentra serviços singleton e infraestrutura transversal. `shared` contém
componentes reutilizáveis. Cada feature mantém seus models, services e componentes.

## Multi-tenancy

O token JWT contém `companyId`. A API resolve a empresa autenticada e toda consulta
de negócio é filtrada pela empresa atual.

```text
Usuário autenticado
    │
    ▼
JWT { sub, role, companyId }
    │
    ▼
Controller / CurrentUser
    │
    ▼
WHERE CompanyId = companyId
```

Isso evita que um usuário de uma empresa consulte registros de outra empresa apenas
alterando IDs na URL.

## RBAC

| Ação | OWNER | ADMIN | MANAGER | USER |
|---|:---:|:---:|:---:|:---:|
| Dashboard / relatórios | ✓ | ✓ | ✓ | ✓ |
| Clientes / ordens | ✓ | ✓ | ✓ | ✓ |
| Gerenciar catálogo | ✓ | ✓ | ✓ | — |
| Movimentar estoque | ✓ | ✓ | ✓ | — |
| Excluir produto | ✓ | ✓ | — | — |
| Gerenciar equipe | ✓ | ✓ | — | — |
| Exportar relatórios | ✓ | ✓ | ✓ | — |

A interface oculta ações sem permissão, mas a decisão de segurança é repetida na API
com roles e policies.

## Fluxo de uma requisição

```text
Component
  │
  ▼
Feature Service
  │
  ▼
Auth Interceptor ── adiciona Bearer token
  │
  ▼
API Error Interceptor ── tratamento transversal
  │
  ▼
ASP.NET Authentication
  │
  ▼
Authorization Policy
  │
  ▼
Controller
  │
  ▼
EF Core / PostgreSQL
```

## Estoque auditável

Saldo não é alterado diretamente pela tela de produtos. Toda mudança passa pelo
endpoint de movimentação e gera uma trilha com saldo anterior, quantidade, saldo
posterior, usuário e data.

## Ordens de serviço

O módulo de ordens combina CRUD e Kanban. O drag-and-drop altera o status pela API
e registra uma atividade na timeline da ordem.

Cada OS pode conter produtos e serviços. Os itens preservam snapshot de SKU, descrição,
unidade e preço. O total da ordem é recalculado no backend. Produtos marcados para afetar
estoque só são baixados quando a OS entra em `DONE`; ao reabrir, a API cria a entrada de
estorno automaticamente. A mudança de status usa transação serializável para impedir que
uma OS seja finalizada com saldo insuficiente.

```text
Item de produto
   │
   ├─ OS aberta → nenhuma baixa
   │
   ├─ Finalizar OS → valida saldo → EXIT → registra timeline
   │
   └─ Reabrir OS → ENTRY de estorno → registra timeline
```

## Relatórios

Os KPIs e rankings são agregados no backend. O Angular recebe o resultado pronto
para visualização, evitando transferir grandes conjuntos de dados apenas para
calcular indicadores no navegador.

## Produção

O `docker-compose.prod.yml` sobe:

```text
Browser
   │
   ▼
Nginx / Angular :8080
   │ /api
   ▼
ASP.NET Core :8080 (container)
   │
   ▼
PostgreSQL :5432 (container)
```

No desenvolvimento, o Angular Dev Server usa `proxy.conf.json` para encaminhar
`/api` a `http://localhost:5080`.


## Qualidade e testes

```text
Pull Request
   │
   ├─ xUnit: regras de domínio do backend
   ├─ Jasmine/Karma: utilitários e comportamento do frontend
   ├─ Angular production build
   └─ Docker image build
```

A precificação de item foi extraída para um serviço de domínio testável e o preview do formulário usa um utilitário puro no Angular. `scripts/smoke.ps1` valida a integração da stack em execução.
