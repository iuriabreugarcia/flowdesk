# Segurança

FlowDesk é um projeto demonstrativo de portfólio. Não envie vulnerabilidades ou credenciais reais por issues públicas.

## Ambiente demonstrativo

- Troque `POSTGRES_PASSWORD` e `JWT_KEY` antes de qualquer publicação.
- Em produção real, use `SeedDemoData=false`.
- Os usuários e senhas demo existem apenas para facilitar avaliação do projeto.
- Não versione o arquivo `.env`.

## Controles implementados

- JWT para autenticação.
- RBAC no frontend e na API.
- `companyId` aplicado nas consultas multi-tenant.
- Senhas armazenadas como hash.
- PostgreSQL não é exposto pelo compose de produção.
- Estoque e alterações relevantes geram trilha de auditoria.
