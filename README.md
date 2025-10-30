# API ONG

Sistema de gerenciamento de produtos para ONGs com busca inteligente via IA.

## Tecnologias
- Backend: Next.js (API Routes)
- Banco: PostgreSQL
- IA: FastAPI + OpenAI
- Infra: Docker Compose

## Como executar

```bash
docker-compose up --build
```

## Endpoints
- Backend: http://localhost:3000
- LLM API: http://localhost:8000
- Banco: localhost:5432

## Estrutura do Projeto
- `backend/` - API Next.js
- `llm-api/` - Serviço de IA FastAPI
- `db/` - Scripts de banco de dados
- `docker-compose.yml` - Orquestração

## Testes (backend)

Para executar os testes do backend utilizando o Postgres do Docker:

```bash
# subir apenas o banco (em background)
docker-compose up -d db

# rodar os testes do backend
cd backend
npm install
npm test

# rodar um teste específico
npm test -- --testPathPattern=integration/publicCatalogDb.spec.ts
```

Observações:
- Os testes de integração usam o Postgres mapeado em localhost:5432 (user/password: user/password, db: ong_db).
- Alguns testes só rodam quando a variável DATABASE_URL está definida; caso contrário, são ignorados automaticamente.