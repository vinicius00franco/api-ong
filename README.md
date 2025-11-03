# API ONG

Sistema de gerenciamento de produtos para ONGs com busca inteligente via IA.

## Tecnologias
- Backend: NestJS + TypeScript
- Banco: PostgreSQL
- IA: FastAPI + OpenAI GPT
- Infra: Docker Compose
- Testes: Jest + Supertest
- Observabilidade: Logging estruturado JSON

## Como executar

### Desenvolvimento completo
```bash
docker-compose up --build
```

### Apenas backend (desenvolvimento)
```bash
# Subir apenas banco
docker-compose up -d db

# No diretório backend
cd backend
npm install
npm run start:dev
```

### Apenas LLM API (desenvolvimento)
```bash
cd llm-api
pip install -r requirements.txt
python main.py
```

## Endpoints

### URLs de acesso
- Backend: http://localhost:3000
- LLM API: http://localhost:8000
- Banco: localhost:5432 (user: user, password: password, db: ong_db)

### API Endpoints (Backend)

#### Autenticação
- `POST /auth/login` - Login (retorna JWT)
  - Body: `{ "email": "string", "password": "string" }`
  - Response: `{ "access_token": "jwt_token" }`

#### Produtos (ONG autenticada - requer Bearer token)
- `GET /products` - Listar produtos da ONG
- `POST /products` - Criar produto
- `GET /products/:id` - Obter produto por ID
- `PUT /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto

#### Catálogo Público
- `GET /public/catalog` - Listar produtos públicos (todas ONGs)

#### Busca Inteligente (requer Bearer token)
- `POST /search` - Busca por linguagem natural
  - Body: `{ "query": "busca em linguagem natural" }`
  - Response: `{ "interpretation": "...", "ai_used": true/false, "fallback_applied": true/false, "data": [...] }`

#### Pedidos (ONG autenticada - requer Bearer token)
- `POST /orders` - Criar pedido
- `GET /orders` - Listar pedidos da ONG
- `GET /orders/:id` - Obter pedido por ID

#### Health Check
- `GET /health` - Status da aplicação

## Configuração

### Variáveis de Ambiente (.env)

Copie o arquivo `.env.example` para `.env` e configure:

```bash
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/ong_db

# JWT
JWT_SECRET=sua-chave-secreta-aqui

# LLM API
LLM_API_URL=http://localhost:8000

# OpenAI (para LLM API)
OPENAI_API_KEY=sua-chave-openai-aqui
```

### Arquivo .env.example

O arquivo `.env.example` contém todas as variáveis necessárias com valores de exemplo.

## Observabilidade e Logging

### Logging Estruturado JSON

A aplicação utiliza logging estruturado em formato JSON para observabilidade:

#### Logs de Request HTTP
```json
{
  "timestamp": "2025-01-11T22:49:59.123Z",
  "route": "/products",
  "method": "GET",
  "status": 200,
  "latency": 45,
  "userId": "user-123",
  "organizationId": "org-456"
}
```

#### Logs de Busca Inteligente
```json
{
  "timestamp": "2025-01-11T22:50:00.456Z",
  "message": "SmartSearch Event",
  "input_text": "produtos de limpeza",
  "generated_filters": "category = 'limpeza'",
  "ai_success": true,
  "fallback_applied": false
}
```

### Monitoramento de Logs

Os logs são estruturados para facilitar:
- Monitoramento de performance (latency)
- Análise de uso (routes, methods)
- Troubleshooting (status codes, errors)
- Auditoria (userId, organizationId)
- IA monitoring (ai_success, fallback_applied)

## Testes

### Cobertura de Testes

- **Total**: 147 testes
- **Cobertura alvo**: 80% (regras de negócio críticas)
- **Metodologia**: TDD (Test-Driven Development)

### Executar Testes

#### Todos os testes
```bash
cd backend
npm test
```

#### Testes de integração (requer banco PostgreSQL)
```bash
# Subir banco
docker-compose up -d db

# Executar testes de integração
npm test -- --testPathPattern=integration
```

#### Testes específicos
```bash
# Teste de logging
npm test -- --testPathPattern=logging

# Teste de busca inteligente
npm test -- --testPathPattern=search

# Teste específico
npm test -- --testPathPattern=integration/publicCatalogDb.spec.ts
```

### Tipos de Teste

- **Unitários**: Services, repositories, middlewares
- **Integração**: APIs completas com banco real
- **E2E**: Fluxos completos da aplicação

## Estrutura do Projeto

```
api-ong/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── auth/         # Autenticação
│   │   ├── products/     # Gestão de produtos
│   │   ├── search/       # Busca inteligente
│   │   ├── orders/       # Pedidos
│   │   ├── public/       # Catálogo público
│   │   ├── lib/          # Utilitários e middlewares
│   │   └── __tests__/    # Testes organizados por feature
│   ├── test/             # Testes E2E
│   └── jest.config.ts    # Configuração Jest
├── llm-api/              # Serviço de IA FastAPI
├── db/                   # Scripts SQL
│   ├── init/             # Inicialização
│   └── docs/             # Documentação ERD
└── docker-compose.yml    # Orquestração
```

## Desenvolvimento

### Branches e Commits

- Branches: `feature/`, `fix/`, `refactor/`
- Commits: Descritivos e organizados por feature

### Qualidade de Código

- TDD obrigatório para novas funcionalidades
- Cobertura mínima 80% em regras críticas
- Multi-tenancy: sempre filtrar por `organization_id`
- Segurança: JWT obrigatório, validação com Zod

## Troubleshooting

### Problemas Comuns

#### Erro "LLM_API_URL não definida"
- Verifique se o arquivo `.env` existe e contém `LLM_API_URL=http://localhost:8000`

#### Testes de integração falham
- Certifique-se que o PostgreSQL está rodando: `docker-compose up -d db`
- Verifique DATABASE_URL no `.env`

#### Porta já em uso
- Backend: porta 3000
- LLM API: porta 8000
- Banco: porta 5432

#### Logs não aparecem
- Verifique se o middleware RequestLoggingMiddleware está registrado no AppModule
- Logs são enviados para stdout/stderr

### Debug

Para debug detalhado:
```bash
# Backend com logs detalhados
cd backend
npm run start:dev

# LLM API com logs
cd llm-api
python main.py
```

## Contribuição

1. Criar branch feature/fix/refactor
2. Seguir TDD: testes primeiro
3. Commit descritivo
4. Pull request com cobertura de testes