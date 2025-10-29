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