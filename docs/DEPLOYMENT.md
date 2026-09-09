# Deploy e operação

## Subir a stack demonstrativa

```powershell
Copy-Item .env.example .env
# edite .env antes de continuar
docker compose -f docker-compose.prod.yml up -d --build
```

Serviços:

- Web: `http://localhost:8080`
- API: `http://localhost:5080`
- PostgreSQL: somente rede Docker

## Health

```powershell
docker ps
Invoke-WebRequest http://localhost:5080/api/health
```

API e web possuem healthchecks no compose de produção.

## Logs

```powershell
docker logs flowdesk-api --tail 150
docker logs flowdesk-web --tail 100
```

## Atualizar sem apagar dados

```powershell
docker compose -f docker-compose.prod.yml up -d --build api web
```

Não use `down -v` em um ambiente cujos dados devam ser preservados.

## Antes de publicar

1. Troque `POSTGRES_PASSWORD`.
2. Gere `JWT_KEY` longa e aleatória.
3. Defina `SeedDemoData=false` fora do ambiente demonstrativo.
4. Configure HTTPS no proxy/reverse proxy da hospedagem.
5. Defina estratégia de backup para o volume PostgreSQL.
